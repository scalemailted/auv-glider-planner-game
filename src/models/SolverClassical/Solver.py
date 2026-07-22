#Solver Template
import math
import world
import my_io
import pythonmonkey as pm
import json
import torch

def find_dist(x, y):
    return max(0.0, math.hypot(x, y))*0.886

def clamp(value, min, max):
    return value if value > min and value < max else min if value < min else max

def find_energy_cost(dirX, dirY, start, frames, t):
    driftGain = 0.5
    try:
        perpX = -(1/dirX)
    except:
        perpX = 0
    try:
        perpY = -(1/dirY)
    except:
        perpY = 0
    along = frames[t]["current"][int(start[0])][int(start[1])][0] * dirX + frames[t]["current"][int(start[0])][int(start[1])][1] * dirY 
    perp = frames[t]["current"][int(start[0])][int(start[1])][0] * perpX + frames[t]["current"][int(start[0])][int(start[1])][1] * perpY
    penalty = 1
    if along > 0:
        penalty += along * driftGain * 0.72
    else:
        penalty += along * driftGain * 0.38      
    penalty += abs(perp) * driftGain * 0.28
    return clamp(penalty, 0.45, 2.6)
def bresenham_line(x0, y0, x1, y1):
    dx = abs(x1 - x0)
    dy = -abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx + dy
    while True:
        yield x0, y0
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 >= dy:
            err += dy
            x0 += sx
        if e2 <= dx:
            err += dx
            y0 += sy
def normalizePathAndScore(path, frames, packet):
    t = 0
    score = 0
    agentPlan = [{"agentId":"glider_01"}]
    wp = []
    totalEnergy = 0
    for idx, (x,y) in enumerate(path):
        energyCost = 0
        if x >= 0 and x < 12 and y >= 0 and y < 12:
            try:
                packet["planningData"]["visibleFields"]["terrain"][int(x)][int(y)]
            except:
                print(y)
            if packet["planningData"]["visibleFields"]["terrain"][int(x)][int(y)] == 1:
                return torch.tensor(-100+(idx*5), dtype=torch.float32, requires_grad=True)
            if idx != 0:
                tempT = 0
                tempScore = 0
                for idx2, (traversedX,traversedY) in enumerate(bresenham_line(int(path[idx-1][0]), path[idx-1][1], int(x), int(y))):
                    tempT += find_dist((x-traversedX), (y-traversedY))
                    t += tempT
                    if packet["planningData"]["visibleFields"]["terrain"][traversedX][traversedY] == 1:
                        return torch.tensor(-100+(idx*5), dtype=torch.float32, requires_grad=True)
                    if packet["planningData"]["visibleFields"]["terrain"][traversedX][traversedY] == 1:
                        tempScore -= packet["mission"]["scoring"]["hazardPenalty"]
                    try:
                        tempScore += frames[round(t)]["roi"][traversedX][traversedY]
                    except:
                        return torch.tensor(-100+(idx*5)+idx2, dtype=torch.float32, requires_grad=True)
                    total = abs(traversedX - x) + abs(traversedY - y)
                    try:
                        dirX = (1 if traversedX < x else -1) * ((traversedX - x)/total)
                        dirY = (1 if traversedY < y else -1) * ((traversedY - y)/total)
                    except:
                        pass
                    energyCost += find_energy_cost(dirX,dirY, (x, y), frames, total)
                tempScore -= energyCost*0.05
                totalEnergy += energyCost
                wp.append({
                    "id": (f"glider_01_colab_wp_{idx+1}"),
                    "window" : max(1,math.floor(t/3)),
                    "t" : round(t, 3),
                    "estimatedArrivalTime": round(t, 3),
                    "segmentTravelTime": round(tempT, 3),
                    "segmentEnergy":round(energyCost, 3),
                    "cumulativeEnergy":round(totalEnergy, 3),
                    "remainingFuelEstimate":round(100-totalEnergy, 3),
                    "x": x,
                    "y": y,
                    "action":"sample",
                    "note":f"colab-template-greedy-v1 expectedValue={tempScore:.3f}"
                })
            else:
                agentPlan.append({
                    "selectedStart":{"x":x, "y":y}
                })
        else:
            return torch.tensor(-100+(idx*5), dtype=torch.float32, requires_grad=True)
    agentPlan.append({"waypoints":wp})
    finalScore = scorer.scoreAndValidate(packet, agentPlan)["report"]["summary"]["finalScore"]
    return torch.tensor(finalScore, dtype=torch.float32, requires_grad=True)
        

class Solver():
    def __init__(self, world, scanStrict, scanMax):
        # self.dims = (world["level"]["meta"]["generationConfig"]["grid"]["width"], world["level"]["meta"]["generationConfig"]["grid"]["height"])
        self.dims = (12,12)
        self.hazards = world["hazards"]
        self.depth = world["depth"]
        self.current = world["current"]
        self.agents = world["agents"]
        self.deploymentCells = world["deploymentAgents"][0]["allowedCells"]
        self.terrain = world["terrain"]
        self.hazards = world["hazards"]
        self.timeLimit = 12
        self.paths = []
        self.frames = world["level"]["layers"]["forecast"]["frames"]
        self.preparedFrames = {}
        self.nowRoi = None
        self.nowCurrent = None
        self.scanMax = scanMax
        self.scanStrict = scanStrict
        # self.priorityTargets = world["packet"]["planningData"]["priorityTargets"]
        self.stars = []
        self.hazardPenalty = world["mission"]["scoring"]["hazardPenalty"]/100
        self.finalPaths = []
        self.numAgents = 1
        self.planningWindow = world["planningWindow"]
        self.agentPlans = []
        self.canidatesMade = 0
        self.best = 0

        # for index, star in enumerate(self.priorityTargets):
        #     self.stars.append({index:{}})               
        #     self.stars[index].update({"value":star["value"]/10, "frames":star["frames"], "collected":False})
    def find_best_paths(self):
        for agent in range(self.numAgents):
            self.find_best_path(agent, previousCells=self.finalPaths)
        return self.agentPlans
    def find_best_path(self, agent, previousCells=[]):
        self.paths = [] 
        self.prepare_frames()
        self.deployment_canidates(previousCells, agent)
        self.update_paths(previousCells, agent)

    def prepare_frames(self):
        for frame in self.frames:
            self.preparedFrames.update({int(frame["t"]):{"current" : frame["current"], "roi" : frame["roi"]}})
            self.nowRoi = self.preparedFrames[0]["roi"]
            self.nowCurrent = self.preparedFrames[0]["current"]

    def update_frames(self, time):
        roundedTime = round(time)
        self.nowRoi = self.preparedFrames[roundedTime]["roi"]
        self.nowCurrent = self.preparedFrames[roundedTime]["current"]

    def update_paths(self, previousCells, agent):
        for i, path in enumerate(self.paths):
            scans = round(0 if path[1] < self.scanStrict*0.2 else self.scanMax*0.2 if path[1] < self.scanStrict*0.4 else self.scanMax*0.4 if path[1] < self.scanStrict*0.6 else self.scanMax*0.6 if path[1] < 0.9*self.scanStrict else self.scanMax*0.8 if path[1] < self.scanStrict else self.scanMax)
            if scans == self.scanMax:
                self.best +=1
            if not isinstance(path[0][0], tuple):
                temp1 = path[0].pop(0)
                temp2 = path[0].pop(0)
                path[0].insert(0, (temp1, temp2))
            self.make_canidates(path[0][-1], path[0], scans, agent, path[1], i, path[2], path[3], previousCells, path[4], path[6])
        self.paths.sort(key= lambda item: item[1]*item[3])
        agentPlan = {"agentId":f"glider_0{agent+1}", "waypoints":self.paths[-1][6], "selectedStart":{"x":self.paths[-1][0][0][0],"y":self.paths[-1][0][0][1]}}
        self.agentPlans.append(agentPlan)
        for cell in self.paths[-1][0]:
            self.finalPaths.append(cell)

    def deployment_canidates(self, previousCells, agent):
        for deploymentCell in self.deploymentCells:
            tupDeploymentCell = (deploymentCell["x"], deploymentCell["y"])
            self.make_canidates(tupDeploymentCell, [tupDeploymentCell], 5, agent, pastPathTraversed=previousCells)
    def make_canidates(self, cell, cells, num, agent, value=0, destroyIndex=None, time=0, Olddistance=0, pastPathTraversed=[], totalEnergy=0, wps=()):
        traversedCells = []
        segmentTime = 0
        potential = []
        if isinstance(cells, list):
            for index, (x,y) in enumerate(cells):
                try:
                    for traversedX, traversedY in self.bresenham_line(x, y, cells[index+1][0], cells[index+1][1]):
                        if traversedCells.count((traversedX, traversedY)) == 0:
                            traversedCells.append((traversedX, traversedY))
                except IndexError:
                    pass
        for cell in pastPathTraversed:
            if traversedCells.count(cell) == 0:
                traversedCells.append(cell)
        for y in range(int(self.dims[1])):
            for x in range(int(self.dims[0])):
                self.canidatesMade += 1
                if self.terrain[y][x] != 1 and self.hazards[y][x] != 1 and traversedCells.count((x,y)) == 0 and (x,y) != cell and ([cell["x"] for cell in self.deploymentCells].count(x) <= 1 and [cell["y"] for cell in self.deploymentCells].count(y) <= 1):
                    scored, distance, energyCost = self.rate_cell((x,y), cell, traversedCells, time)
                    segmentTime = distance
                    if distance != -1 and scored != -1:
                        Thistime = time
                        Thistime += distance
                        distance += Olddistance
                        listwps = list(wps)
                        if Thistime < self.timeLimit:
                            potential.append([(x,y), scored, Thistime, segmentTime, energyCost, totalEnergy+energyCost, listwps])
        potential.sort(reverse=True, key=lambda item: item[1]/segmentTime)
        final = potential[:(num + 1)]
        for item in final:
            temp = item[0]
            item[1] += value
            item[0] = []
            for cell in cells:
                item[0].append(cell)
            item[0].append(temp)
            item.append(traversedCells)
            item[6].append({
                "id": (f"glider_0{agent+1}_colab_wp_{len(cells)}" if isinstance(cells, list) else f"glider_0{agent+1}_colab_wp_{len(cells)-1}"),
                "window" : max(1,math.floor(time/self.planningWindow)),
                "t" : round(time, 3),
                "estimatedArrivalTime": round(time, 3),
                "segmentTravelTime": round(item[3], 3),
                "segmentEnergy":round(item[4], 3),
                "cumulativeEnergy":round(item[5], 3),
                "remainingFuelEstimate":round(100-item[5], 3),
                "x": temp[0],
                "y": temp[1],
                "action":"sample",
                "note":f"colab-template-greedy-v1 expectedValue={item[1]:.3f}"
                })
            self.paths.append(item)
        if destroyIndex != None:
            self.paths.pop(destroyIndex)
    def rate_cell(self, ratedCell, startCell, traversedCells, timed):
        score = 0
        distance = 0
        oldX = startCell[0]
        oldY = startCell[1]
        liveDistance = timed
        energy_cost = 0
        length = 0
        for cellX, cellY in self.bresenham_line(startCell[0], startCell[1], ratedCell[0], ratedCell[1]):
            length += 1
            if startCell != (cellX, cellY):
                tempdist = self.find_dist((cellX - oldX), (cellY - oldY))
                liveDistance += tempdist
                total = abs(cellX - oldX) + abs(cellY - oldY)
                dirX = (1 if cellX < oldX else -1) * ((cellX - oldX)/total)
                dirY = (1 if cellY < oldY else -1) * ((cellY - oldY)/total)
                energy_cost += self.find_energy_cost(dirX, dirY, (oldX, oldY))
                distance+=tempdist
                self.update_frames(liveDistance if liveDistance < self.timeLimit+0.5 else self.timeLimit)
            if cellX != -1:
                if traversedCells.count((cellX, cellY)) != 0:
                    if self.hazards[cellX][cellY] != 1:
                        score += self.nowRoi[cellY][cellX]["expectedValue"]
                    else:
                        score += (self.nowRoi[cellY][cellX]["expectedValue"] - self.hazardPenalty)
            else:
                return -1, -1, -1
            # score += self.checkStar((cellX, cellY), liveDistance)
        for cellX, cellY in self.anti_aliased_line(startCell[0], startCell[1], ratedCell[0], ratedCell[1]):
            if self.terrain[int(cellY)][int(cellX)] == 1:
                return -1,-1, -1
        score -= energy_cost*0.05
        return score, distance*0.886, energy_cost     
    def find_dist(self, x, y):
        return max(0.0, math.hypot(x, y))
    
    # def checkStar(self, cell, time):
    #     for star in self.stars:
    #         starLocation = self.getStarPlaceTime(star, time)
    #         if starLocation == cell:
    #             return star["value"]/10
    #     return 0

    # def getStarPlaceTime(self, star, time):
    #     diff = {}
    #     for index, frame in enumerate(star["frames"]):
    #         diff.update({index:abs(time-frame["t"])})
    #     diff = dict(sorted(diff.items()))
    #     bestFrame = star["frames"][list(diff.keys())[0]]
    #     if bestFrame["active"]:
    #         return (bestFrame["x"], bestFrame["y"])
    #     else:
    #         return (-999,-999)
    
    def anti_aliased_line(self, x0, y0, x1, y1):
        dx, sx = abs(x1-x0), 1 if x0 < x1 else -1
        dy, sy = abs(y1-y0), 1 if y0 < y1 else -1
        err = dx-dy
        ed = 1 if dx+dy == 0 else math.sqrt(dx*dx + dy*dy)
        while True:
            x2 = x0
            yield x0, y0
            e2 = err
            if 2*e2 >= -dx:
                if x0 == x1: break
                if e2+dy < ed: 
                    yield x0, y0+sy
                err, x0 = err - dy, x0 + sx
            if 2*e2 <= dy:
                 if y0 == y1: break
                 if dx-e2 < ed: 
                      yield x2+sx, y0
                 err, y0 = err+dx, y0+sy
    def bresenham_line(self, x0, y0, x1, y1):
        dx = abs(x1 - x0)
        dy = -abs(y1 - y0)
        sx = 1 if x0 < x1 else -1
        sy = 1 if y0 < y1 else -1
        err = dx + dy
        while True:
            if self.terrain[int(y0)][int(x0)] != 1:
                yield x0, y0
            else: 
                yield -1, -1
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy
                x0 += sx
            if e2 <= dx:
                err += dx
                y0 += sy
    def find_energy_cost(self, dirX, dirY, start):
        driftGain = 0.5
        try:
            perpX = -(1/dirX)
        except:
            perpX = 0
        try:
            perpY = -(1/dirY)
        except:
            perpY = 0
        along = self.nowCurrent[int(start[0])][int(start[1])][0] * dirX + self.nowCurrent[int(start[0])][int(start[1])][1] * dirY 
        perp = self.nowCurrent[int(start[0])][int(start[1])][0] * perpX + self.nowCurrent[int(start[0])][int(start[1])][1] * perpY
        penalty = 1
        if along > 0:
            penalty += along * driftGain * 0.72
        else:
            penalty += along * driftGain * 0.38      
        penalty += abs(perp) * driftGain * 0.28
        return self.clamp(penalty, 0.45, 2.6)
    def clamp(self, value, min, max):
        return value if value > min and value < max else min if value < min else max
file = my_io.load_solver_packet(r"C:\Users\wabbi\Downloads\anchor.solver-packet (44).json")
# print(solverWorld["roi"][3][5])
# for thing in packet:
    # print(thing)
    # downloader = pm.require(r"C:\Users\wabbi\Downloads\NotebookAndRecources\generationHeadless\main")
    # packet = downloader.downloadPacket()
    # packet["mission"]["scoring"].update({"energyPenalty":0.05, "hazardPenalty":150, "elapsedTimePenalty":0.01})
    # packet["deployment"]["agents"][0]["allowedCells"] = [
    #     {"x": 1, "y": 1},
    #     {"x": 2, "y": 1},
    #     {"x": 3, "y": 1},
    #     {"x": 1, "y": 2},
    #     {"x": 2, "y": 2},
    #     {"x": 3, "y": 2}
    # ]
def packet_to_plan(packet, scanStrict, scanMax):
    solverWorld=world.build_headless_world(file)
    solved = Solver(solverWorld, scanStrict, scanMax)
    bestPaths= solved.find_best_paths()
    print(solved.canidatesMade)
    print(solved.best)
    del solved
    return bestPaths
final = (packet_to_plan(1,1,10))
file["mission"]["agents"][0]["deployment"]["selectedStart"] = final[0]["selectedStart"]
scorer = pm.require(r"C:\Users\wabbi\Downloads\models\ScoreAndValidate\main.js")
print(scorer.scoreAndValidate(file, final)["planValidation"]["ok"])


# print(normalizePathAndScore(final, file["level"]["layers"]["forecast"]["frames"], file))
