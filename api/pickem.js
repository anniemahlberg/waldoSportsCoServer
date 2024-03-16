const express = require('express');
const { getAllPickEmPicks, 
        getPickEmPickById, 
        updatePickEmPick, 
        createPickEmPick, 
        createWeeklyPick, 
        getGameById, 
        getWeeklyPickById, 
        getWeeklyPickByUsername, 
        updateWeeklyPick, 
        getAllActiveWeeklyPicksByWeek, 
        updateUser, 
        getUserByUsername,
        deletePickEm,
        getPickEmPicksByWeeklyId, 
        } = require('../db');
const { requireUser, requireAdmin } = require('./utils');
const pickEmRouter = express.Router();

pickEmRouter.get('/', async (req, res) => {
    const pickEmPicks = await getAllPickEmPicks();

    res.send({
        pickEmPicks
    });
});

pickEmRouter.get('/pickem/id/:pickId', async (req, res) => {
    const { pickId } = req.params;
    const pickEmPick = await getPickEmPickById(pickId);

    res.send({
        pickEmPick
    });
});

pickEmRouter.post('/addPickEmPick', requireUser, async (req, res, next) => {
    const { gameid, type, bet, text } = req.body;
    const weeklyPick = await getWeeklyPickByUsername(req.user.username)

    try {
        if (weeklyPick ) {
            const pickEmPick = await createPickEmPick({ weeklyid: weeklyPick.id, gameid, type, bet, text });
            if (pickEmPick) {
                res.send({ message: 'You have made a pickem pick!', pickEmPick});
            } else {
                res.send({message: `You have already made a ${type} pick for this game!`, name: "DuplicatePickError"})
            }
        } else if (!weeklyPick) {
            const game = await getGameById(gameid)
            const newWeeklyPick = await createWeeklyPick({ username: req.user.username, week: game.week})
            const pickEmPick = await createPickEmPick({ weeklyid: newWeeklyPick.id, gameid, type, bet, text })
            res.send({ message: 'You have made a pickem pick!', pickEmPick});
        }
    } catch ({ name, message }) {
        next({ name, message })
    }
});

pickEmRouter.patch('/pickem/id/updatePickEmPick/:pickId', requireUser, async (req, res, next) => {
    const { pickId } = req.params;
    const { gameid, type, bet, text } = req.body;
    let updateFields = {}

    if (gameid) {
        updateFields.gameid = gameid;
    }

    if (type) {
        updateFields.type = type;
    }
    
    if (bet) {
        updateFields.bet = bet;
    }

    if (text) {
        updateFields.text = text;
    }
    
    try {
        const pickEmPick = await getPickEmPickById(pickId);
        const weeklypick = await getWeeklyPickById(pickEmPick.weeklyid)
        if (pickEmPick && weeklypick.username === req.user.username) {
            let updatedPickEmPick = await updatePickEmPick(pickId, updateFields)
            res.send({ pickEmPick: updatedPickEmPick });
        } else if (pickEmPick && weeklypick.username !== req.user.username) {
            next({
                name: 'UnauthorizedUserError',
                message: 'You cannot edit a pick that is not yours'
            })
        } else {
            next({
                name: 'PickNotFoundError',
                message: 'That pick does not exist'
            });
        }
    } catch ({ name, message }) {
        next({ name, message });
    }
})

pickEmRouter.patch('/pickem/id/updateWeeklyPick/:weeklyPickId', requireAdmin, async (req, res, next) => {
    const { weeklyPickId } = req.params;
    const { week, active, totalpickem, totalcorrectpickem, pickemwins, currentpickemwinner} = req.body;
    let updateFields = {}

    if (week) {
        updateFields.week = week;
    }

    if (active) {
        updateFields.active = active;
    }
    
    if (totalpickem) {
        updateFields.totalpickem = totalpickem;
    }

    if (totalcorrectpickem) {
        updateFields.totalcorrectpickem = ttotalcorrectpickemotalbets;
    }

    if (pickemwins) {
        updateFields.pickemwins = pickemwins;
    }

    if (currentpickemwinner) {
        updateFields.currentpickemwinner = currentpickemwinner;
    }
    
    try {
        const weeklypick = await getWeeklyPickById(weeklyPickId)
        if (weeklypick) {
            let updatedWeeklyPick = await updateWeeklyPick(weeklyPickId, updateFields)
            res.send({ weeklypick: updatedWeeklyPick });
        } else {
            next({
                name: 'PickNotFoundError',
                message: 'That pick does not exist'
            });
        }
    } catch ({ name, message }) {
        next({ name, message });
    }
})

pickEmRouter.patch('/updateResults/pickem', requireAdmin, async (req, res, next) => {
    const { week } = req.body;

    try {
        const allweeklypicks = await getAllActiveWeeklyPicksByWeek(week)
        if (allweeklypicks) {
            allweeklypicks.forEach(async (weeklyPick) => {
                const user = await getUserByUsername(weeklyPick.username)
                const allPickEmPicks = await getPickEmPicksByWeeklyId(weeklyPick.id);
                const pickEmPicks = allPickEmPicks.filter(pickEmPick => pickEmPick.statsupdated === false)

                if (allPickEmPicks.length) {
    
                    let pickshit = 0;
                    let picksmiss = 0;
                    let pickstbd = 0;
                    let pickspush = 0;
    
                    allPickEmPicks.forEach(async (picksixPick) => {
                        if (pickEmPick.result === "HIT") {
                            pickshit++;
                        } else if (pickEmPick.result === "MISS") {
                            picksmiss++;
                        } else if (pickEmPick.result === "PUSH") {
                            pickspush++
                        } else if (pickEmPick.result === "tbd") {
                            pickstbd++
                        }
                    })

                    if (pickstbd > 0 || !pickEmPicks.length) {
                        return;
                    } else if (picksmiss > 0) {
                        pickEmPicks.forEach(async (pickEmPick) => {
                            await updatePickEmPick(pickEmPick.id, {statsupdated: true})
                        })
                        await updateWeeklyPick(weeklyPick.id, {totalpickem: weeklyPick.totalpickem + 1})
                        await updateUser(user.id, {totalpickem: user.totalpickem + 1})
                    } else if (pickspush > 0) {
                        pickEmPicks.forEach(async (pickEmPick) => {
                            await updatePickEmPick(pickEmPick.id, {statsupdated: true})
                        })
                        await updateWeeklyPick(weeklyPick.id, {totalpickem: weeklyPick.totalpickem + 1})
                        await updateUser(user.id, {totalpickem: user.totalpickem + 1})
                    } else if (pickshit === allPickEmPicks.length) {
                        pickEmPicks.forEach(async (pickEmPick) => {
                            await updatePickEmPick(pickEmPick.id, {statsupdated: true})
                        })
                        await updateWeeklyPick(weeklyPick.id, {totalpickem: weeklyPick.totalpickem + 1, totalcorrectpickem: weeklyPick.totalcorrectpickem + 1})
                        await updateUser(user.id, {totalcorrectpickem: user.totalcorrectpickem + 1, totalpickem: user.totalpickem + 1})
                    }
                    
                }
            })
        }

        res.send({message: "Picksix points are added!"})
    } catch ({name, message}) {
        next({name, message})
    }
})

pickEmRouter.delete('/deletePickEm/:pickId', requireUser, async (req, res, next) => {
    const { pickId } = req.params
    const pickem = await getPickEmPickById(pickId)

    try {
        if (pickem) {
            await deletePickEm(pickId);
            res.send({message: 'You have deleted your pickem'})
        } else {
            next({
                name: 'PickEmNotFoundError',
                message: 'That pickem does not exist'
            })
        }
    } catch ({name, message}) {
        next({name, message})
    }
})


module.exports = pickEmRouter;