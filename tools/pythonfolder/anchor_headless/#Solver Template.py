#Solver Template
import math
import world
import my_io

class Solver():
    def __init__(self, world):
        self.dims = (world["width"], world["height"])
        self.hazards = world["hazards"]
        self.depth = world["depth"]
        self.roi = world["roi"]
        self.current = world["current"]
        self.agents = world["agents"]
        self.duration = world["duration"]
        self.deploymentCells = world["deploymentAgents"][0]["allowedCells"]
        self.scoring = world["scoring"]
        self.terrain = world["terrain"]
        self.timeLimit = 12
        self.paths = []
        self.depth = 1
    def find_best_path(self):
        print("hi")
        self.deployment_canidates()
        self.update_paths()

    def update_paths(self):
        pathLength = len(self.paths)
        for i, path in enumerate(self.paths):
            # print(self.paths[-1])
            scans = 0 if path[1] < 0.2 else 1 if path[1] < 0.4 else 2 if path[1] < 0.6 else 3 if path[1] < 0.9 else 4 if path[1] < 1 else 5
            self.make_canidates(path[0][-1], path[0], scans, path[1], i, path[2], path[3])
        # self.paths = self.paths[pathLength:]
        # print(self.paths)


    def is_point(self, pathSegment, iteration):
        return not isinstance(pathSegment[iteration][-1], tuple)

    def deployment_canidates(self):
        for deploymentCell in self.deploymentCells:
            tupDeploymentCell = (deploymentCell["x"], deploymentCell["y"])
            self.make_canidates(tupDeploymentCell, (tupDeploymentCell), 5)

    def make_canidates(self, cell, cells, num, value=0, destroyIndex=None, time=0, Olddistance=0):
        used = cells
        potential = []
        for y in range(len(self.roi)):
            for x in range(len(self.roi[y])):
                if self.terrain[y][x] != 1 and self.hazards[y][x] != 1 and used.count((x,y)) == 0 and (x,y) != cell:
                    scored, distance = self.rate_cell((x,y), cell)
                    Thistime = time
                    Thistime += distance
                    distance += Olddistance
                    print(distance)
                    if Thistime < 12:
                        # print(Thistime)
                        potential.append([(x,y), scored, Thistime, distance])
        
        potential.sort(reverse=True, key=lambda item: item[1])
        final = potential[:(num + 1)]            
        for item in final:
            temp = item[0]
            item[1] = (item[1] + value) / (len(cells) - 1)
            item[0] = []
            item[0].append(cells)
            item[0].append(temp)
            self.paths.append(item)
        if destroyIndex != None:
            self.paths.pop(destroyIndex)

    def rate_cell(self, ratedCell, startCell):
        score = 0
        distance = self.find_dist(ratedCell[0] - startCell[0], ratedCell[1] - startCell[1])
        for cellX, cellY in self.bresenham_line(startCell[0], startCell[1], ratedCell[0], ratedCell[1]):
            score += self.roi[cellY][cellX]
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
file = my_io.load_solver_packet(r"pythonfolder\anchor_headless\anchor.solver-packet (4).json")

world=world.build_headless_world(file)
solved = Solver(world)

solved.find_best_path()






    # def test_canidate(self, canidate, prev):
    #     value = 0
    #     distance = 0
    #     energyUse = 0
    #     speed = 1
    #     for x, y in self.bresenham_line(canidate[0], canidate[1], prev[0], prev[1]):
    #         value += self.roi[y][x]
    #         dx = x - prev[0]
    #         dy = y - prev[1]
    #         distance += self.find_dist(dx, dy)
    #     return value/distance
    # def make_canidates_for_deployment(self):
    #     for cellIndex, cell in enumerate(self.deploymentCells):
    #         self.find_canidates(5, cell, cellIndex)            
    # def find_best_path(self):
    #     for cell in self.deploymentCells:
    #         pass

    # def find_canidates(self, num, cell, pathIndex):
    #     used = [cell]
        
    # def prepare_path(self, pathIndex, new):
    #     path = self.path
    #     for num in len(pathIndex):
    #         path[pathIndex[num]] = path            

    # def rate_canidates(self, canidates):
    #     for index, canidate in enumerate(canidates):
    #         prev = canidates[index - 1]
    #         self.testCanidate(canidate, prev)
            
