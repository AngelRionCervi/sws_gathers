const enslClient = require("../ensl/client")();
const EloRank = require("elo-rank");
const User = require("../user/user.js");


const elo = new EloRank(32);

const updateElo = async (result) => {
    const marines = await Promise.all(result.players.marines.map(async (id) => {
        return await User.findV2(id);
    }));

    const aliens = await Promise.all(result.players.aliens.map(async (id) => {
        return await User.findV2(id);
    }));

    const totalEloMarines = marines.reduce((acc, player) => {
        return acc + (player.gatherElo || 0);
    }, 0) / marines.length;

    const totalEloAliens = aliens.reduce((acc, player) => {
        return acc + (player.gatherElo || 0);
    }, 0) / aliens.length;

    const expectedScoreMarine = elo.getExpected(totalEloAliens, totalEloMarines);
    const expectedScoreAlien = elo.getExpected(totalEloMarines, totalEloAliens);

    const eloMarineUpdatePromises = marines.map(async (player) => {
        const newElo = elo.updateRating(expectedScoreMarine, result.winner === "marine", player.gatherElo) || 0;
        await player.setNewGatherElo(newElo);
    });

    const eloAlienUpdatePromises = aliens.map(async (player) => {
        const newElo = elo.updateRating(expectedScoreAlien, result.winner === "alien", player.gatherElo) || 0;
        await player.setNewGatherElo(newElo);
    });

    await Promise.all([...eloMarineUpdatePromises, ...eloAlienUpdatePromises]);
    console.log(marines[0], marines.map(m => m.profile.gatherElo), "winner : " + result.winner);
};

module.exports = {
    updateElo
};
