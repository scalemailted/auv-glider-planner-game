from torch import nn
import torch
import math
from SolverClassical import my_io

device = torch.device("cuda")
class NeuralNetwork(nn.Module):
    def __init__(self):
        super().__init__()
        self.flatten = nn.Flatten()
        self.linear_relu_stack = nn.Sequential(
            nn.Linear(5910, 1500),
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

model = NeuralNetwork()
stateDict = torch.load('model_weights9.pth', weights_only=True)
model.load_state_dict(stateDict)
model.to(device)

packet = my_io.load_solver_packet(r"C:\Users\wabbi\Downloads\anchor.solver-packet (44).json")
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

print(len(flat))
forecast = torch.tensor(flat).to("cuda:0")

previous = torch.tensor([]).to(device)
for miniBatch in range(0, 11, 2):
    previous = previous[previous != 999.0000]
    previous = torch.nn.functional.pad(previous, pad=(0, 5-miniBatch+1), mode="constant", value=999)
    final = torch.cat((forecast, previous), dim=0)

    pred = model(final)
    previous = torch.cat((previous, pred.flatten()))
    print(previous)