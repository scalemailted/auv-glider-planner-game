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
        self.timeLimit = 15
        self.paths = []
        self.depth = 1
        self.frames = world["level"]["layers"]["truth"]["frames"]
        self.preparedFrames = {}
        self.nowRoi = None
        self.nowCurrent = None
        self.scanMax = 10

    def find_best_path(self):
        print("hi")
        self.prepare_frames()
        self.deployment_canidates()
        self.update_paths()

    def prepare_frames(self):
        for frame in self.frames:
            self.preparedFrames.update({frame["t"]:{"current" : frame["current"], "roi" : frame["roi"]}})
            self.nowRoi = self.preparedFrames[0]["roi"]
            self.nowCurrent = self.preparedFrames[0]["current"]

    def update_frames(self, time):
        roundedTime = round(time)
        self.nowRoi = self.preparedFrames[roundedTime]["roi"]
        self.nowCurrent = self.preparedFrames[roundedTime]["current"]

    def update_paths(self):
        # pathLength = len(self.paths)
        for i, path in enumerate(self.paths):
            # print(self.paths[-1])
            scans = round(0 if path[1] < 0.2 else self.scanMax*0.2 if path[1] < 0.4 else self.scanMax*0.4 if path[1] < 0.6 else self.scanMax*0.6 if path[1] < 0.9 else self.scanMax*0.8 if path[1] < 1 else self.scanMax)
            if not isinstance(path[0][0], tuple):
                # print(path[0])
                temp1 = path[0].pop(0)
                temp2 = path[0].pop(0)
                path[0].insert(0, (temp1, temp2))
                # print(path[0])
            self.make_canidates(path[0][-1], path[0], scans, path[1]*path[2], i, path[2], path[3])
        # self.paths = self.paths[pathLength:]
        # print(self.paths)
        self.paths.sort(key= lambda item: item[1]*item[3])
        print(self.paths[-1])
        print(self.paths[-1][1] * self.paths[-1][3])

    def deployment_canidates(self):
        for deploymentCell in self.deploymentCells:
            tupDeploymentCell = (deploymentCell["x"], deploymentCell["y"])
            self.make_canidates(tupDeploymentCell, (tupDeploymentCell), 5)

    def make_canidates(self, cell, cells, num, value=0, destroyIndex=None, time=0, Olddistance=0):
        # print("1")
        traversedCells = []
        used = cells
        potential = []
        # print(cells)
        if isinstance(cells, list):
            # print(cells)
            for index, (x,y) in enumerate(cells):
                try:
                    for traversedX, traversedY in self.bresenham_line(x, y, cells[index+1][0], cells[index+1][1]):
                        traversedCells.append((traversedX, traversedY))
                except IndexError:
                    "string"
        for y in range(len(self.nowRoi)):
            for x in range(len(self.nowRoi[y])):
                if self.terrain[y][x] != 1 and self.hazards[y][x] != 1 and used.count((x,y)) == 0 and (x,y) != cell and ([cell["x"] for cell in self.deploymentCells].count(x) <= 1 and [cell["y"] for cell in self.deploymentCells].count(y) <= 1):
                    scored, distance = self.rate_cell((x,y), cell, traversedCells, time)
                    if distance != -1 and scored != -1:
                        Thistime = time
                        Thistime += distance
                        distance += Olddistance
                        # print(distance)
                        if Thistime < 12:
                            # print(Thistime)
                            potential.append([(x,y), scored, Thistime, distance])
        potential.sort(reverse=True, key=lambda item: item[1])
        final = potential[:(num + 1)]
        for item in final:
            newTraversedCells = traversedCells            
            if isinstance(cells, list):
                for x, y in self.bresenham_line(cells[-1][0], cells[-1][1], item[0][0], item[0][1]):
                    if (x,y) != (cells[-1][0], cells[-1][1]):
                        newTraversedCells.append((x,y))
            temp = item[0]
            item[1] = (item[1] + value) / (len(newTraversedCells) - 1)
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
        distance = self.find_dist(ratedCell[0] - startCell[0], ratedCell[1] - startCell[1])
        oldX = startCell[0]
        oldY = startCell[1]
        liveDistance = timed
        for cellX, cellY in self.bresenham_line(startCell[0], startCell[1], ratedCell[0], ratedCell[1]):
            if startCell != (cellX, cellY):
                liveDistance += self.find_dist((cellX - oldX), (cellY - oldY))
                # print(liveDistance)
                self.update_frames(liveDistance if liveDistance < 12.5 else 12)

            if cellX != -1:
                if traversedCells.count((cellX, cellY)) != 0:
                    score += self.nowRoi[cellY][cellX]
            else:
                return -1, -1
        return score/distance, distance
    def find_dist(self, x, y):
        return max(0.0, math.hypot(x, y))

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
file = my_io.load_solver_packet(r"C:\Users\wabbi\OneDrive\Documents\GitHub\auv-glider-planner-game\tools\pythonfolder\anchor_headless\anchor.solver-packet (4).json")

world=world.build_headless_world(file)
solved = Solver(world)

solved.find_best_path()