from torch import nn
import torch
import pythonmonkey as pm
import math
import sys
from SolverClassical import SolverForM
import time

downloader = pm.require("./generationHeadless/main")
scorer = pm.require("./ScoreAndValidate/main.js")
device = torch.device("cuda")
sys.path.append(r"C:\Users\wabbi\Downloads\models\SolverClassical\world.py")

print(f"Using device: {device}")
class NeuralNetwork(nn.Module):
    def __init__(self):
        super().__init__()
        self.flatten = nn.Flatten()
        self.linear_relu_stack = nn.Sequential(
            nn.Linear(5914, 1500),
            nn.LeakyReLU(),
            nn.Dropout(0.3),

            nn.Linear(1500, 512),
            nn.LeakyReLU(),
            nn.Dropout(0.2),

            nn.Linear(512, 256),
            nn.LeakyReLU(),
            nn.Dropout(0.2),

            nn.Linear(256, 128),
            nn.LeakyReLU(),

            nn.Linear(128, 64),
            nn.LeakyReLU(),

            nn.Linear(64, 2)
        )

    def forward(self, x):
        X = x.unsqueeze(0)
        logits = self.linear_relu_stack(X)
        logits = torch.sigmoid(logits) * 11
        return logits
    

def make_data(batchSize):
    for batchIter in range(batchSize):
        packet = downloader.downloadPacket()
        packet["mission"]["scoring"].update({"energyPenalty":0.05, "hazardPenalty":150, "elapsedTimePenalty":0.01})
        packet["deployment"]["agents"][0]["allowedCells"] = [
            {"x": 1, "y": 1},
            {"x": 2, "y": 1},
            {"x": 3, "y": 1},
            {"x": 1, "y": 2},
            {"x": 2, "y": 2},
            {"x": 3, "y": 2}
        ]
        yield packet

def normalizePathAndScore(path, frames, packet):
    t = 0
    score = 0
    agentPlan = [{"agentId":"glider_01"}]
    wp = []
    scorer = pm.require("./ScoreAndValidate/main.js")
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

def normalize_pred(pred):
    newPred = []
    idx = 0
    while True:
        newPred.append((int(round(idx)), int(round(pred[idx+1]))))
        idx += 2
        if idx == 8:
            break
    return newPred

model = NeuralNetwork()
stateDict = torch.load('model_weights11.pth', weights_only=True)
model.load_state_dict(stateDict)

model.to(device)
optimizer = torch.optim.Adam(model.parameters(),lr=3e-5)

def train_loop():
    model.train()
    avgLoss = 0
    trueBatch = 0
    for batch, packet in enumerate(make_data(100)):
        fixedData = []
        for frame in packet["level"]["layers"]["forecast"]["frames"]:
            fixedData.append([
            
                [[pair[1] for pair in row] for row in frame["current"]], 
                [[pair[0] for pair in row] for row in frame["current"]], 
                [[pair["expectedValue"] if not isinstance(pair, float) else pair for pair in row] for row in frame["roi"]]
            ])

        temp = []
        temp.append(packet["planningData"]["visibleFields"]["terrain"])
        temp.append(packet["planningData"]["visibleFields"]["hazards"])

        flat = [item3 for sublist3 in [item2 for sublist2 in [item for sublist in fixedData for item in sublist] for item2 in sublist2] for item3 in sublist3]

        [flat.append(math.floor(item2)) for sublist2 in [item for sublist in temp for item in sublist] for item2 in sublist2]

        forecast = torch.tensor(flat).to("cuda:0")

        base = SolverForM.packet_to_plan(packet, 0.5, 30)
        if not isinstance(base, int):
            fixed = torch.tensor(base, dtype=torch.float32).flatten().to("cuda:0")
            for miniBatch in range(0, 11, 2):
                previous = fixed[:miniBatch]
                previous = torch.nn.functional.pad(previous, pad=(0, 10-miniBatch), mode="constant", value=999)
                final = torch.cat((forecast, previous), dim=0)
                optimizer.zero_grad()
                pred = model(final)
                cords = pred[:2]
                current = torch.cat((fixed[miniBatch].reshape(1), fixed[miniBatch+1].reshape(1)), dim=0)

                diffT = cords - current
                diffT = torch.square(diffT*math.sqrt(2))

                loss = torch.mean(diffT, dtype=torch.float32)

                loss.backward()
                torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
                optimizer.step()
                avgLoss += loss.item()
            trueBatch += 1
        else:
            trueBatch += 1
            print("it happended")
            loss = -1
        if batch % 10 == 0:
            try:
                print(f"Average loss: {avgLoss/(6*trueBatch)} | Batch num :{batch} | Average diff: {math.sqrt(avgLoss/(6*trueBatch))/1.4} | This loss: {loss.detach()} | This diff: {math.sqrt(loss.detach())/1.4}")
            except:
                print("thats rare")



learning_rate =  1e-4

optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)

epochs = 1000000000000
pastBaseline = 0
for epoch in range(epochs):
    print(f"Epoch {epoch+1}\n-------------------------------")
    train_loop()
    torch.save(model.state_dict(), r'C:\Users\wabbi\Downloads\models\model_weights9.pth')
    # torch.save(model.state_dict(), r'C:\Users\wabbi\Downloads\models\model_weights8.pth')
print("Done!")
print("Done!")