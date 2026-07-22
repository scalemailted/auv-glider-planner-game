from torch import nn
import torch
import pythonmonkey as pm
import math
import sys
import cupy as cp
import copy
from SolverClassical import SolverForM
import random

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
        try:
            packet["planningData"]["visibleFields"]["terrain"][int(x)][int(y)]
        except:
            print(y)
        if idx != 0:
            tempT = 0
            tempScore = 0
            for idx2, (traversedX,traversedY) in enumerate(bresenham_line(int(path[idx-1][0]), path[idx-1][1], int(x), int(y))):
                tempT += find_dist((x-traversedX), (y-traversedY))
                t += tempT
                try:
                    tempScore += frames[round(t)]["roi"][traversedX][traversedY]
                except:
                    pass
                if packet["planningData"]["visibleFields"]["terrain"][traversedX][traversedY] == 1:
                    tempScore -= packet["mission"]["scoring"]["hazardPenalty"]
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
            agentPlan[0].update({
                "selectedStart":{"x":x, "y":y}
            })
    agentPlan[0].update({"waypoints":wp})
    if agentPlan[0]["waypoints"] != []:
        finalScore = scorer.scoreAndValidate(packet, agentPlan)["report"]["summary"]["finalScore"]
    else:
        xy = [(thing["x"], thing["y"]) for thing  in packet["deployment"]["agents"][0]["allowedCells"]]
        if xy.count((agentPlan[0]["selectedStart"]["x"], agentPlan[0]["selectedStart"]["y"])) != 0:
            finalScore = 30
        else:
            finalScore = random.randrange(10)
    return torch.tensor(finalScore, dtype=torch.float32)
        

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
    try:
        along = frames[t]["current"][int(start[0])][int(start[1])][0] * dirX + frames[t]["current"][int(start[0])][int(start[1])][1] * dirY 
        perp = frames[t]["current"][int(start[0])][int(start[1])][0] * perpX + frames[t]["current"][int(start[0])][int(start[1])][1] * perpY
    except:
        along = frames[11]["current"][int(start[0])][int(start[1])][0] * dirX + frames[11]["current"][int(start[0])][int(start[1])][1] * dirY 
        perp = frames[11]["current"][int(start[0])][int(start[1])][0] * perpX + frames[11]["current"][int(start[0])][int(start[1])][1] * perpY
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

def normalize_pred(pred, batch):
    batch+=2
    newPred =  []
    idx = 0
    pred = pred.tolist()
    for idx in range(0,batch,2):
        newPred.append((int(round(idx)), int(round(pred[idx+1]))))
    return newPred

model = NeuralNetwork()
stateDict = torch.load('model_weights11.pth', weights_only=True)
model.load_state_dict(stateDict)

model.to(device)
optimizer = torch.optim.Adam(model.parameters(),lr=3e-5)

# def train_loop():
#     model.train()
#     avgLoss = 0
#     trueBatch = 0
#     for batch, packet in enumerate(make_data(100)):
#         fixedData = []
#         for frame in packet["level"]["layers"]["forecast"]["frames"]:
#             fixedData.append([
            
#                 [[pair[1] for pair in row] for row in frame["current"]], 
#                 [[pair[0] for pair in row] for row in frame["current"]], 
#                 [[pair["expectedValue"] if not isinstance(pair, float) else pair for pair in row] for row in frame["roi"]]
#             ])

#         temp = []
#         temp.append(packet["planningData"]["visibleFields"]["terrain"])
#         temp.append(packet["planningData"]["visibleFields"]["hazards"])

#         flat = [item3 for sublist3 in [item2 for sublist2 in [item for sublist in fixedData for item in sublist] for item2 in sublist2] for item3 in sublist3]

#         [flat.append(math.floor(item2)) for sublist2 in [item for sublist in temp for item in sublist] for item2 in sublist2]

#         forecast = torch.tensor(flat).to("cuda:0")

#         base = SolverForM.packet_to_plan(packet, 0.5, 30)
#         if not isinstance(base, int):
#             fixed = torch.tensor(base, dtype=torch.float32).flatten().to("cuda:0")
#             for miniBatch in range(0, 11, 2):
#                 previous = fixed[:miniBatch]
#                 previous = torch.nn.functional.pad(previous, pad=(0, 10-miniBatch), mode="constant", value=999)
#                 final = torch.cat((forecast, previous), dim=0)
#                 optimizer.zero_grad()
#                 pred = model(final)
                
#                 cords = pred[:2]
#                 current = torch.cat((fixed[miniBatch].reshape(1), fixed[miniBatch+1].reshape(1)), dim=0)

#                 diffT = cords - current
#                 diffT = torch.square(diffT*math.sqrt(2))

#                 loss = torch.mean(diffT, dtype=torch.float32)

#                 loss.backward()
#                 torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
#                 optimizer.step()
#                 avgLoss += loss.item()
#             trueBatch += 1
#         else:
#             trueBatch += 1
#             print("it happended")
#             loss = -1
#         if batch % 10 == 0:
#             try:
#                 print(f"Average loss: {avgLoss/(6*trueBatch)} | Batch num :{batch} | Average diff: {math.sqrt(avgLoss/(6*trueBatch))/1.4} | This loss: {loss.detach()} | This diff: {math.sqrt(loss.detach())/1.4}")
#             except:
#                 print("thats rare")


def getReward(weights, packet, forecast, fixed, index):
    with torch.no_grad():
        score = 0
        previous = fixed[:index*2]
        previous = torch.nn.functional.pad(previous, pad=(0, 10-index*2), mode="constant", value=999)
        final = torch.cat((forecast, previous), dim=0)
        pred = weights(final)
        predPrevious = torch.cat((fixed[:index*2], torch.squeeze(pred)), dim=0)
        fixedPred = normalize_pred(predPrevious, index*2)

        score += normalizePathAndScore(fixedPred, packet["level"]["layers"]["forecast"]["frames"], packet)
        return score

modelShape = cp.array([])
for param in model.parameters():
    modelShape = cp.append(modelShape, param.shape)

POPULATION_SIZE = 25 
SIGMA = 0.05

def evo_loop():
    with torch.no_grad():
        masterRewards = torch.tensor([]).to(device)
        for generation, packet in enumerate(make_data(25)):
            indexToPick = random.randrange(6)
            best = -9999
            total = 0
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
            master_params = torch.cat([p.view(-1) for p in model.parameters()])
            noise_population = []
            rewards = torch.zeros(POPULATION_SIZE)
            base = SolverForM.packet_to_plan(packet, 0.5, 30)

            if not isinstance(base, int):
                fixed = torch.tensor(base, dtype=torch.float32).flatten().to("cuda:0")

                for i in range(POPULATION_SIZE):
                    base = SolverForM.packet_to_plan(packet, 0.5, 30)
                    noise = torch.randn_like(master_params).to(device)
                    noise_population.append(noise)
                    
                    child = copy.deepcopy(model).to(device)
                    mutated_params = master_params + SIGMA * noise
                    
                    idx = 0
                    for p in child.parameters():
                        numel = p.numel()
                        p.data.copy_(mutated_params[idx:idx+numel].view_as(p))
                        idx += numel
                        
                    rewards[i] += getReward(child, packet, forecast, fixed, indexToPick)
                    best = rewards[i] if rewards[i] > best else best
                    total += rewards[i]
            
                if rewards.std() > 0:
                    rewards = (rewards - rewards.mean()) / rewards.std()
                    rewards = torch.tensor([reward if reward > 0 else 0 for reward in rewards])
                    
                update_vector = torch.zeros_like(master_params)
                for i in range(POPULATION_SIZE):
                    update_vector += noise_population[i] * rewards[i]
                    
                new_master_params = master_params + (learning_rate / (POPULATION_SIZE * SIGMA)) * update_vector

                idx = 0
                for p in model.parameters():
                    numel = p.numel()
                    p.data.copy_(new_master_params[idx:idx+numel].view_as(p))
                    idx += numel
                masterReward = getReward(model, packet, forecast, fixed, indexToPick).to(device)
                masterRewards = torch.cat((masterRewards, torch.unsqueeze(masterReward, dim=0)), dim=0).to(device)
                print(f"Gen {generation} | Index Generated: {indexToPick} Average Reward: {total/POPULATION_SIZE} | Best Reward: {best} | Current Master Reward: {masterReward}")
    return masterRewards

learning_rate =  1e-4


epochs = 1000000000000
pastBaseline = 0
for epoch in range(epochs):
    print(f"Epoch {epoch+1}\n-------------------------------")
    evo_loop()
    torch.save(model.state_dict(), r'C:\Users\wabbi\Downloads\models\model_weights11.pth')
    # torch.save(model.state_dict(), r'C:\Users\wabbi\Downloads\models\model_weights8.pth')
print("Done!")
print("Done!")