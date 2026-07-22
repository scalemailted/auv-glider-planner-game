const HeadlessRoundtrip = require("./HeadlessRoundtrip");

function scoreAndValidate(packet, plan) {
    return HeadlessRoundtrip.buildHeadlessSolverPacketRoundtrip(packet, plan, {oracle:true})
}

module.exports = {scoreAndValidate}