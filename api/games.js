const express = require('express');
const gamesRouter = express.Router();
const { getAllGames,
        createGame, 
        updateGame, 
        getGameById,
        getPicksByGameIdAndType, 
        addOutcomeToPick, 
        getAllGamesByWeek, 
        getAllActiveGames, 
        getWeeklyPickById, 
        updateUser, 
        updateWeeklyPick, 
        getUserById, 
        getUserByUsername, 
        deleteGame, 
        getAllWeeklyPicksByWeek,
        getParlayPicksByGameIdAndType, 
        addOutcomeToParlayPick, 
        getParlayPicksByWeeklyId, 
        getAllActiveWeeklyPicks, 
        getAllActiveWeeklyPicksByWeek,
        getPicksixPicksByGameIdAndType,
        addOutcomeToPicksixPick,
        getPickEmPicksByGameIdAndType,
        addOutcomeToPickEmPick
    } = require('../db');
const { requireAdmin } = require('./utils');

gamesRouter.get('/', async (req, res) => {
    const games = await getAllGames();
    res.send({
        games
    });
});

gamesRouter.get('/active', async (req, res) => {
    const games = await getAllActiveGames();

    res.send({
        games
    });
});

gamesRouter.get('/byWeek/:week', async (req, res) => {
    const { week } = req.params
    const games = await getAllGamesByWeek(week);

    res.send({
        games
    });
});

gamesRouter.get('/:gameId', async (req, res) => {
    const { gameId } = req.params;

    const game = await getGameById(gameId);

    res.send({
        game
    });
});

gamesRouter.post('/add', requireAdmin, async (req, res, next) => {
    const { week, hometeam, awayteam, level, date, time, primetime, duration, over, under, chalk, dog, totalpoints, favoredteam, line } = req.body;

    try {
        if (req.user.username) {
            const game = await createGame({
                week, hometeam, awayteam, level, date, time, primetime, duration, over, under, chalk, dog, totalpoints, favoredteam, line
            });
    
            res.send({ message: 'you have added a new game!', game});
        } else {
            next({
                name: 'UnauthorizedUserError',
                message: 'You are not allowed to add games'
            })
        }
    } catch ({ name, message }) {
        next({ name, message })
    }
});

gamesRouter.patch('/byWeek/:week', requireAdmin, async (req, res, next) => {
    const { week } = req.params;
    const { type } = req.body;
    const games = await getAllGamesByWeek(week);
    const weeklyPicks = await getAllWeeklyPicksByWeek(week);
    
    try {
        if (games && weeklyPicks && type === 'deactivate') {
            games.forEach(async (game) => {
                await updateGame(game.id, {active: false})
            })

            weeklyPicks.forEach(async (weeklyPick) => {
                await updateWeeklyPick(weeklyPick.id, {active: false})
            })

            res.send({ message: `You have deactivated all games from week ${week}. Let's start a new week!`})
        } else if (games && weeklyPicks && type === 'activate') {
            games.forEach(async (game) => {
                await updateGame(game.id, {active: true})
            })

            res.send({ message: `You have activated all games from week ${week}. Let's play!!`})
        }
    } catch ({name, message}) {
        next({name, message})
    }
})

gamesRouter.patch('/:gameId', requireAdmin, async (req, res, next) => {
    const { gameId } = req.params;
    const { hometeam, awayteam, level, week, date, time, primetime, duration, over, under, chalk, dog, totalpoints, favoredteam, line, active } = req.body;
    let updateFields = {};

    if (hometeam) {
        updateFields.hometeam = hometeam;
    }

    if (awayteam) {
        updateFields.awayteam = awayteam;
    }

    if (level) {
        updateFields.level = level;
    }

    if (week) {
        updateFields.week = week;
    }

    if (date) {
        updateFields.date = date;
    }

    if (time) {
        updateFields.time = time;
    }

    if (primetime) {
        updateFields.primetime = primetime;
    } else if (primetime === false) {
        updateFields.primetime = false
    }

    if (duration) {
        updateFields.duration = duration;
    }

    if (over) {
        updateFields.over = over;
    } else if (over === false) {
        updateFields.over = false
    }

    if (under) {
        updateFields.under = under;
    } else if (under === false) {
        updateFields.under = false
    }

    if (chalk) {
        updateFields.chalk = chalk;
    } else if (chalk === false) {
        updateFields.chalk = false
    }

    if (dog) {
        updateFields.dog = dog;
    } else if (dog === false) {
        updateFields.dog = false
    }

    if (totalpoints) {
        updateFields.totalpoints = totalpoints;
    }

    if (favoredteam) {
        updateFields.favoredteam = favoredteam;
    }

    if (line) {
        updateFields.line = line;
    }

    if (active) {
        updateFields.active = active;
    }

    try {
        const game = await getGameById(gameId);

        if (game) {
            let updatedGame = await updateGame(gameId, updateFields)
            res.send({ game: updatedGame });
        } else if (game) {
            next({
                name: 'UnauthorizedUserError',
                message: 'You cannot update games'
            })
        } else {
            next({
                name: 'GameNotFoundError',
                message: 'That game does not exist'
            });
        }
    } catch ({ name, message }) {
        next({ name, message });
    }
})

gamesRouter.patch('/updateResults/:gameId', requireAdmin, async (req, res, next) => {
    const { gameId } = req.params;
    const { totalpointsoutcome, lineoutcome, totalpointsoutcometext, lineoutcometext, moneylineoutcome, moneylineoutcometext } = req.body;
    let updateFields = {};

    if (totalpointsoutcome) {
        updateFields.totalpointsoutcome = totalpointsoutcome;
    }
    if (lineoutcome) {
        updateFields.lineoutcome = lineoutcome;
    }

    if (moneylineoutcome) {
        updateFields.moneylineoutcome = moneylineoutcome
    }

    try {
        const game = await getGameById(gameId);

        if (game) {
            let updatedGame = await updateGame(gameId, updateFields)
            if ((game.chalk || game.dog) && lineoutcome) {
                const picksToUpdate = await getPicksByGameIdAndType(gameId, "line")
                if (picksToUpdate) {
                    let updatedPicks = []
                    picksToUpdate.forEach(async pick => {
                        if (!pick.statsupdated) {
                            let updateFieldsForPick = {
                                outcome: lineoutcome,
                                outcometext: lineoutcometext,
                                statsupdated: true
                            }
    
                            if (pick.bet === lineoutcome) {
                                updateFieldsForPick.pointsawarded = pick.worth
                            } else if (lineoutcome === "push") {
                                updateFieldsForPick.pointsawarded = 0;
                            } else {
                                updateFieldsForPick.pointsawarded = -pick.worth;
                            }
    
                            let updatedPick = await addOutcomeToPick(pick.id, updateFieldsForPick);
                            updatedPicks.push(updatedPick)
    
                            const weeklypick = await getWeeklyPickById(pick.weeklyid)
                            let weeklyPickUpdateFields = {}
                            weeklyPickUpdateFields.totalbets =  weeklypick.totalbets + 1;
                            weeklyPickUpdateFields.totalpoints = weeklypick.totalpoints + updateFieldsForPick.pointsawarded;
    
                            if (updateFieldsForPick.pointsawarded > 0) {
                                weeklyPickUpdateFields.betscorrect = weeklypick.betscorrect + 1;
                            }
    
                            if (pick.lock && updateFieldsForPick.pointsawarded > 0) {
                                weeklyPickUpdateFields.lockscorrect = weeklypick.lockscorrect + 1;
                                weeklyPickUpdateFields.totallocks = weeklypick.totallocks + 1;
                            } else if (pick.lock && updateFieldsForPick.pointsawarded < 0) {
                                weeklyPickUpdateFields.totallocks = weeklypick.totallocks + 1;
                            }
    
                            await updateWeeklyPick(weeklypick.id, weeklyPickUpdateFields)
    
                            const user = await getUserByUsername(weeklypick.username)
                            let userUpdateFields = {}
                            userUpdateFields.totalbets =  user.totalbets + 1;
                            userUpdateFields.totalpoints = user.totalpoints + updateFieldsForPick.pointsawarded;
    
                            if (updateFieldsForPick.pointsawarded > 0) {
                                userUpdateFields.betscorrect = user.betscorrect + 1;
                            }
    
                            if (pick.lock && updateFieldsForPick.pointsawarded > 0) {
                                userUpdateFields.lockscorrect = user.lockscorrect + 1;
                                userUpdateFields.totallocks = user.totallocks + 1;
                            } else if (pick.lock && updateFieldsForPick.pointsawarded < 0) {
                                userUpdateFields.totallocks = user.totallocks + 1;
                            }
    
                            await updateUser(user.id, userUpdateFields)
                        }

                    })
                }
            }

            if ((game.over || game.under) && totalpointsoutcome) {
                const picksToUpdate = await getPicksByGameIdAndType(gameId, "totalpoints")
                if (picksToUpdate) {
                    let updatedPicks = []
                    picksToUpdate.forEach(async pick => {
                        if (!pick.statsupdated) {
                            let updateFieldsForPick = {
                                outcome: totalpointsoutcome,
                                outcometext: totalpointsoutcometext,
                                statsupdated: true
                            }
    
                            if (pick.bet === totalpointsoutcome) {
                                updateFieldsForPick.pointsawarded = pick.worth
                            } else if (totalpointsoutcome === "push") {
                                updateFieldsForPick.pointsawarded = 0;
                            } else {
                                updateFieldsForPick.pointsawarded = -pick.worth;
                            }
    
                            let updatedPick = await addOutcomeToPick(pick.id, updateFieldsForPick);
                            updatedPicks.push(updatedPick)
    
                            const weeklypick = await getWeeklyPickById(pick.weeklyid)
                            let weeklyPickUpdateFields = {}
                            weeklyPickUpdateFields.totalbets =  weeklypick.totalbets + 1;
                            weeklyPickUpdateFields.totalpoints = weeklypick.totalpoints + updateFieldsForPick.pointsawarded;
    
                            if (updateFieldsForPick.pointsawarded > 0) {
                                weeklyPickUpdateFields.betscorrect = weeklypick.betscorrect + 1;
                            }
    
                            if (pick.lock && updateFieldsForPick.pointsawarded > 0) {
                                weeklyPickUpdateFields.lockscorrect = weeklypick.lockscorrect + 1;
                                weeklyPickUpdateFields.totallocks = weeklypick.totallocks + 1;
                            } else if (pick.lock && updateFieldsForPick.pointsawarded < 0) {
                                weeklyPickUpdateFields.totallocks = weeklypick.totallocks + 1;
                            }
    
                            await updateWeeklyPick(weeklypick.id, weeklyPickUpdateFields)
    
                            const user = await getUserByUsername(weeklypick.username)
                            let userUpdateFields = {}
                            userUpdateFields.totalbets =  user.totalbets + 1;
                            userUpdateFields.totalpoints = user.totalpoints + updateFieldsForPick.pointsawarded;
    
                            if (updateFieldsForPick.pointsawarded > 0) {
                                userUpdateFields.betscorrect = user.betscorrect + 1;
                            }
    
                            if (pick.lock && updateFieldsForPick.pointsawarded > 0) {
                                userUpdateFields.lockscorrect = user.lockscorrect + 1;
                                userUpdateFields.totallocks = user.totallocks + 1;
                            } else if (pick.lock && updateFieldsForPick.pointsawarded < 0) {
                                userUpdateFields.totallocks = user.totallocks + 1;
                            }
    
                            await updateUser(user.id, userUpdateFields)

                        }
                    })
                }
            }
            
            if ((game.chalk || game.dog) && lineoutcome) {
                const parlaysToUpdate = await getParlayPicksByGameIdAndType(gameId, "line")
                if (parlaysToUpdate) {
                    let updatedParlays = []
                    parlaysToUpdate.forEach(async parlay => {
                        let updateFieldsForParlay = {
                            outcome: lineoutcome,
                            outcometext: lineoutcometext
                        }

                        if (parlay.bet === lineoutcome) {
                            updateFieldsForParlay.result = "HIT"
                        } else if (lineoutcome === "push") {
                            updateFieldsForParlay.result = "PUSH"
                        } else {
                            updateFieldsForParlay.result = "MISS"
                        }

                        let updatedParlay = await addOutcomeToParlayPick(parlay.id, updateFieldsForParlay);
                        updatedParlays.push(updatedParlay)

                    })
                }
            }

            if ((game.over || game.under) && totalpointsoutcome) {
                const parlaysToUpdate = await getParlayPicksByGameIdAndType(gameId, "totalpoints")
                if (parlaysToUpdate) {
                    let updatedParlays = []
                    parlaysToUpdate.forEach(async parlay => {
                        let updateFieldsForParlay = {
                            outcome: totalpointsoutcome,
                            outcometext: totalpointsoutcometext
                        }

                        if (parlay.bet === totalpointsoutcome) {
                            updateFieldsForParlay.result = "HIT"
                        } else if (totalpointsoutcome === "push") {
                            updateFieldsForParlay.result = "PUSH"
                        } else {
                            updateFieldsForParlay.result = "MISS"
                        }

                        let updatedParlay = await addOutcomeToParlayPick(parlay.id, updateFieldsForParlay);
                        updatedParlays.push(updatedParlay)

                    })
                }
            }

            if ((game.chalk || game.dog) && lineoutcome) {
                const picksixToUpdate = await getPicksixPicksByGameIdAndType(gameId, "line")
                if (picksixToUpdate) {
                    let updatedParlays = []
                    picksixToUpdate.forEach(async parlay => {
                        let updateFieldsForParlay = {
                            outcome: lineoutcome,
                            outcometext: lineoutcometext
                        }

                        if (parlay.bet === lineoutcome) {
                            updateFieldsForParlay.result = "HIT"
                        } else if (lineoutcome === "push") {
                            updateFieldsForParlay.result = "PUSH"
                        } else {
                            updateFieldsForParlay.result = "MISS"
                        }

                        let updatedParlay = await addOutcomeToPicksixPick(parlay.id, updateFieldsForParlay);
                        updatedParlays.push(updatedParlay)

                    })
                }
            }

            if ((game.over || game.under) && totalpointsoutcome) {
                const picksixToUpdate = await getPicksixPicksByGameIdAndType(gameId, "totalpoints")
                if (picksixToUpdate) {
                    let updatedParlays = []
                    picksixToUpdate.forEach(async parlay => {
                        let updateFieldsForParlay = {
                            outcome: totalpointsoutcome,
                            outcometext: totalpointsoutcometext
                        }

                        if (parlay.bet === totalpointsoutcome) {
                            updateFieldsForParlay.result = "HIT"
                        } else if (totalpointsoutcome === "push") {
                            updateFieldsForParlay.result = "PUSH"
                        } else {
                            updateFieldsForParlay.result = "MISS"
                        }

                        let updatedParlay = await addOutcomeToPicksixPick(parlay.id, updateFieldsForParlay);
                        updatedParlays.push(updatedParlay)

                    })
                }
            }

            if ((game.chalk || game.dog) && moneylineoutcome) {
                const pickemToUpdate = await getPickEmPicksByGameIdAndType(gameId, "moneyline")
                if (pickemToUpdate) {
                    let updatedPickEms = []
                    pickemToUpdate.forEach(async pickem => {
                        let updateFieldsForPickEm = {
                            outcome: moneylineoutcome,
                            outcometext: moneylineoutcometext
                        }

                        let updatedPickEm = await addOutcomeToPickEmPick(pickem.id, updateFieldsForPickEm);
                        updatedPickEms.push(updatedPickEm)
                    })
                }
            }            

            res.send({message: 'Games are updated!'});

        } else if (game) {
            next({
                name: 'UnauthorizedUserError',
                message: 'You are not allowed to update games'
            })
        } else {
            next({
                name: 'GameNotFoundError',
                message: 'That game does not exist'
            });
        }
    } catch ({ name, message }) {
        next({ name, message });
    }
})

gamesRouter.delete('/:gameId', async (req, res, next) => {
    const { gameId } = req.params
    const game = await getGameById(gameId)

    try {
        if (game) {
            await deleteGame(gameId);
            res.send({message: 'You have deleted a game'})
        } else {
            next({
                name: 'GameNotFoundError',
                message: 'That game does not exist'
            })
        }
    } catch ({name, message}) {
        next({name, message})
    }
})

module.exports = gamesRouter;