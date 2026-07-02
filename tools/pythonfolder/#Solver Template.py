#Solver Template
import math
import world
import my_io
class Solver():
    def __init__(self, world):
        self.dims = (world["width"], world["height"])
        self.hazards = world["hazards"]
        self.depth = world["depth"]
        self.current = world["current"]
        self.agents = world["agents"]
        self.duration = world["duration"]
        self.deploymentCells = world["deploymentAgents"][0]["allowedCells"]
        self.scoring = world["scoring"]
        self.terrain = world["terrain"]
        self.timeLimit = 12
        self.paths = []
        self.frames = world["level"]["layers"]["truth"]["frames"]
        self.preparedFrames = {}
        self.nowRoi = None
        self.nowCurrent = None
        self.scanMax = 1000
        self.scanStrict = 0.01
        self.priorityTargets = world["packet"]["planningData"]["priorityTargets"]
        self.stars = []
        self.hazardPenalty = world["packet"]["mission"]["scoring"]["hazardPenalty"]/100
        self.finalPaths = []
        # self.numAgents = 2   //h..      
        self.numAgents = len(world["packet"]["mission"]["agents"])

        for index, star in enumerate(self.priorityTargets):
            self.stars.append({index:{}})               
            self.stars[index].update({"value":star["value"]/10, "frames":star["frames"], "collected":False})
    def find_best_paths(self):
        for agent in range(self.numAgents):
            self.find_best_path(self.finalPaths)
    def find_best_path(self, previousCells=[]):
        self.paths = [] 
        self.prepare_frames()
        self.deployment_canidates(previousCells)
        self.update_paths(previousCells)

    def prepare_frames(self):
        for frame in self.frames:
            self.preparedFrames.update({frame["t"]:{"current" : frame["current"], "roi" : frame["roi"]}})
            self.nowRoi = self.preparedFrames[0]["roi"]
            self.nowCurrent = self.preparedFrames[0]["current"]

    def update_frames(self, time):
        roundedTime = round(time)
        self.nowRoi = self.preparedFrames[roundedTime]["roi"]
        self.nowCurrent = self.preparedFrames[roundedTime]["current"]

    def update_paths(self, previousCells):
        for i, path in enumerate(self.paths):
            scans = round(0 if path[1] < self.scanStrict*0.2 else self.scanMax*0.2 if path[1] < self.scanStrict*0.4 else self.scanMax*0.4 if path[1] < self.scanStrict*0.6 else self.scanMax*0.6 if path[1] < 0.9*self.scanStrict else self.scanMax*0.8 if path[1] < self.scanStrict else self.scanMax)
            if not isinstance(path[0][0], tuple):
                temp1 = path[0].pop(0)
                temp2 = path[0].pop(0)
                path[0].insert(0, (temp1, temp2))
            self.make_canidates(path[0][-1], path[0], scans, path[1], i, path[2], path[3], previousCells)
        self.paths.sort(key= lambda item: item[1]*item[3])
        for cell in self.paths[-1][4]:
            self.finalPaths.append(cell)
        print(self.paths[-1])
        print(self.paths[-1][1] * self.paths[-1][3])
        print()

    def deployment_canidates(self, previousCells):
        for deploymentCell in self.deploymentCells:
            tupDeploymentCell = (deploymentCell["x"], deploymentCell["y"])
            self.make_canidates(tupDeploymentCell, (tupDeploymentCell), 5, pastPathTraversed=previousCells)
  
    def make_canidates(self, cell, cells, num, value=0, destroyIndex=None, time=0, Olddistance=0, pastPathTraversed=[]):
        traversedCells = []
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
        for y in range(len(self.nowRoi)):
            for x in range(len(self.nowRoi[y])):
                if self.terrain[y][x] != 1 and self.hazards[y][x] != 1 and traversedCells.count((x,y)) == 0 and (x,y) != cell and ([cell["x"] for cell in self.deploymentCells].count(x) <= 1 and [cell["y"] for cell in self.deploymentCells].count(y) <= 1):
                    scored, distance   = self.rate_cell((x,y), cell, traversedCells, time)
                    if distance != -1 and scored != -1:
                        Thistime = time
                        Thistime += distance
                        distance += Olddistance
                        if Thistime < self.timeLimit:
                            potential.append([(x,y), scored, Thistime, distance])
        potential.sort(reverse=True, key=lambda item: item[1]/distance)
        final = potential[:(num + 1)]
        for item in final:
            temp = item[0]
            item[1] += value
            item[0] = []
            for cell in cells:
                item[0].append(cell)
            item[0].append(temp)
            item.append(traversedCells)
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
                        score += self.nowRoi[cellY][cellX]
                    else:
                        score += (self.nowRoi[cellY][cellX] - self.hazardPenalty)
            else:
                return -1, -1
            score += self.checkStar((cellX, cellY), liveDistance)
        for cellX, cellY in self.anti_aliased_line(startCell[0], startCell[1], ratedCell[0], ratedCell[1]):
            if self.terrain[cellY][cellX] == 1:
                return -1,-1
        score -= energy_cost*0.05
        return score, distance
        
    def find_dist(self, x, y):
        return max(0.0, math.hypot(x, y))
    
    def checkStar(self, cell, time):
        for star in self.stars:
            starLocation = self.getStarPlaceTime(star, time)
            # print(starLocation)
            if starLocation == cell:
                # print("found")
                return star["value"]
        return 0

    def getStarPlaceTime(self, star, time):
        diff = {}
        for index, frame in enumerate(star["frames"]):
            diff.update({index:abs(time-frame["t"])})
        diff = dict(sorted(diff.items()))
        bestFrame = star["frames"][list(diff.keys())[0]]
        if bestFrame["active"]:
            print("g")
            return (bestFrame["x"], bestFrame["y"])
        else:
            return (-999,-999)
    
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
            if self.terrain[y0][x0] != 1:
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
        along = self.current[start[0]][start[1]][0] * dirX + self.current[start[0]][start[1]][0] * dirY 
        perp = self.current[start[0]][start[1]][0] * perpX + self.current[start[0]][start[1]][0] * perpY
        penalty = 1
        if along > 0:
            penalty += along * driftGain * 0.72
        else:
            penalty -= along * driftGain * 0.38      
        penalty += perp * driftGain * 0.28
        return self.clamp(penalty, 0.45, 2.6)
    def clamp(self, value, min, max):
        return value if value > min and value < max else min if value < min else max
file = my_io.load_solver_packet(r"C:\Users\wabbi\OneDrive\Documents\GitHub\auv-glider-planner-game\tools\pythonfolder\anchor_headless\anchor.solver-packet (4).json")

world=world.build_headless_world(file)
slv = Solver(world)

slv.find_best_paths()