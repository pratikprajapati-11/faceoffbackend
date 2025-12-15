import { ServiceReturnVal } from '../../types/common';
import { RespError } from '../../lib/wr_response';
import Base from '../base';
import constants from '../../common/constants';
import { TokenUser } from '../../types/request/user';
import { createGame, guessTurn, createGameTurn } from '../../types/request/game';
import { NotificationRepository, UserRepository, GameTurnRepository, GameRepository } from '../../db/repositories';

import Game, { IGame } from '../../db/models/mongoose/game';
import GameTurn, { IGameTurns } from '../../db/models/mongoose/game_turn';
import { INotification } from '../../db/models/mongoose/notification';
import AppFunction from '../../lib/app_functions';
import { Notification } from '../../types/request/notification';
// import Emotion from '../../db/models/mongoose/emotion';
import mongoose from 'mongoose';
import Emotion from '../../db/models/mongoose/emotion';
import User from '../../db/models/mongoose/user';
// import User from '../../db/models/mongoose/user';
// import User from '../../db/models/mongoose/user';

export default class GameService extends Base {
  private GameRepo = new GameRepository();
  private GameTurnRepo = new GameTurnRepository();
  private NotificationRepo = new NotificationRepository();
  private UserRepo = new UserRepository();
  private AppFunctionRepo = new AppFunction();

  /**
   * @description Function for registration of new game
   * @param
   * @returns
   */
  public async createGame(
    params: createGame,
    currentUser: TokenUser,
    uploadedFilesParams: any,
  ): Promise<ServiceReturnVal<Object>> {
    const returnVal: ServiceReturnVal<Object> = {};
    console.log('Currentuser', currentUser._id);

    // get opponent details
    console.log('params.opponent', params.opponent);
    let opponentDetails = await this.UserRepo.findById(params.opponent);
    console.log('opponentDetails', opponentDetails);
    // check if the opponent is valid
    if (!opponentDetails || params.opponent == currentUser._id) {
      returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_404, constants.ERROR_MESSAGES.OPPONENT_NOT_FOUND);
      return returnVal;
    }
    console.log('opponentDetails', opponentDetails);

    // prepare game object
    let game = <IGame>{
      createdBy: this.GameRepo.toObjectId(currentUser._id),
      opponent: this.GameRepo.toObjectId(params.opponent),
      turnCount: 1,
    };
    console.log('Game', game);

    console.log('request.files', process.env.SPACE_URL + '/' + uploadedFilesParams.Key);

    // prepare turn object
    let turn = {
      turnBy: currentUser._id,
      emotionSelectedId: params.emotionSelectedId,
      emotionSelectedName: params.emotionSelectedName,
      mediaPath: process.env.SPACE_URL + '/' + uploadedFilesParams.Key,
      emotionSelectedType: params.emotionSelectedType,
      // mediaPath: params.files['media'][0],
      comment: params.comment,
    };
    let path = turn.mediaPath;
    // console.log(params.files);
    console.log('turn', turn);

    const user = await this.UserRepo.findById(currentUser._id);
    // console.log('User coins', user.coins);

    // if(params.deviceType){
    // await User.findOneAndUpdate(
    //   {_id:currentUser._id},
    //   {deviceType:params.deviceType},
    //   {new:true}
    // )
      

    // switch (params.emotionSelectedName) {
    //   case "Easy":
    //     user.coins -= 50;
    //     break;
    //   case "Medium":
    //     user.coins -= 100;
    //     break;
    //   case "Hard":
    //     user.coins -= 150;
    //     break;
    //   default:
    //     // Handle unknown emotionSelectedName
    //     break;
    // }

    console.log('emotionSelectedType', params.emotionSelectedType);
    if (params.emotionSelectedType === 'Easy') {
      user.coins -= 1;
    } else if (params.emotionSelectedType === 'Medium') {
      user.coins -= 2;
    } else if (params.emotionSelectedType === 'Difficult') {
      user.coins -= 3;
    }
    await user.save();
    console.log('User coin 1', user.coins);

    // create the game update the turn
    let createdGame = await this.GameRepo.create(game as unknown as IGame);
    let gameTurn = await this.GameTurnRepo.create(turn as unknown as IGameTurns);
    console.log('gameTurn', gameTurn);

    // update game with turn id
    await this.GameRepo.updateOne(createdGame._id, { $set: { turns: [gameTurn._id] } });

    // creat app notification
    let notification = <INotification>(<unknown>{
      // notification_by:this.UserRepo.toObjectId(currentUser._id),
      notification_by: this.GameRepo.toObjectId(currentUser._id),
      notification_to: this.GameRepo.toObjectId(params.opponent),
      turnCount: 1,
      title: constants.NOTIFICATION_TITILES.NEW_GAME_STARTED,
      message: `${currentUser.firstName} ${currentUser.lastName} has started a new game with you !`,
      type: constants.NOTIFICATION_TYPES.GAME_STRATED,
    });
    this.NotificationRepo.create(notification as unknown as INotification);
    console.log("creat app notification",notification);

    // create a push notification
    let pushNotificationObj = <Notification>{
      title: constants.NOTIFICATION_TITILES.NEW_GAME_STARTED,
      message: `${currentUser.firstName} ${currentUser.lastName} has started a new game with you !`,
      notification_type: constants.NOTIFICATION_TYPES.GAME_STRATED,
      user_id: params.opponent,
    };
    console.log("create a push notification ",pushNotificationObj);

    console.log("params.deviceType",params.deviceType);

    let deviceType
    if(params.deviceType){
      deviceType = params.deviceType
    }
    else{
      deviceType = null
    }

    console.log("deviceType",deviceType);

    // send the notification if the oppoent has fcmToken
    if (opponentDetails.fcmToken) this.AppFunctionRepo.pushNotification(pushNotificationObj, opponentDetails.fcmToken,deviceType);

    if (!createdGame) {
      returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_400, constants.ERROR_MESSAGES.NO_EMOTION_FOUND);
      return returnVal;
    }

    returnVal.data = { game, path, user };
    return returnVal;
  }

  public async getGames(currentUser: TokenUser): Promise<ServiceReturnVal<Object>> {
    const returnVal: ServiceReturnVal<Object> = {};
    const userId = this.GameRepo.toObjectId(currentUser._id);
    const { _id } = currentUser;
    const user = await this.UserRepo.findById(_id);

    const games: any = await this.GameRepo.getMyGames(userId);
    // console.log("games",games[0].game.opponent._id);
    // const opponentName = games[0].game.opponent.firstName;
    // console.log("opponentId",opponentName);
    console.log('Games', games);

    const gamesWithTurn = games.map((game) => {
      let myTurn;
      let turnText = 'Guess';
      game.game.turns?.turnBy.equals(currentUser._id) ? (myTurn = false) : (myTurn = true);
      // if (game.game.turns?.guessResult?.emotionSelectedName) turnText = 'Play';
      if (game.game.turns?.guessResult) turnText = 'Play';

      return { game: game.game, myTurn, turnText };
    });
    // console.log(user,gamesWithTurn);
    returnVal.data = { gamesWithTurn, user };
    return returnVal;
  }

  public async guessTurn(params: guessTurn, currentUser: TokenUser): Promise<ServiceReturnVal<Object>> {
    const returnVal: ServiceReturnVal<Object> = {};

    console.log('params and currentuser ', params, currentUser);

    const turnId = params.turnId;

    console.log('turnId', turnId);
    // check if the user is creator or opponent
    let gameDetails = await this.GameRepo.findOne({
      $and: [
        {
          $or: [{ createdBy: currentUser._id }, { opponent: currentUser._id }],
        },
        { turns: turnId },
      ],
    });

    console.log('GameDetails', gameDetails);

    console.log('GameDetails', gameDetails.createByConfig);

    // if (!gameDetails) {
    //   returnVal.error = new RespError(
    //     constants.RESP_ERR_CODES.ERR_403,
    //     constants.ERROR_MESSAGES.GAME_DOES_NOT_BELONG_TO_YOU,
    //   );
    //   return returnVal;
    // }

    const turn: any = await this.GameTurnRepo.findById(turnId);
    // const dummy = await GameTurn.findOne({turnId});
    // console.log(dummy);

    // const turn:any = await GameTurn.findOne({turnId});
    console.log('turn', turn);

    let rewardCoins;

    if (turn.emotionSelectedType === 'Easy') {
      rewardCoins = 1;
    } else if (turn.emotionSelectedType === 'Medium') {
      rewardCoins = 2;
    } else if (turn.emotionSelectedType === 'Difficult') {
      rewardCoins = 3;
    }

    // check if the turn is valid | and is still incomplete
    if (!turn) {
      returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_403, constants.ERROR_MESSAGES.INVALID_TURN);
      return returnVal;
    }

    console.log('turn.emotion', turn.emotionSelectedId);

    let emotionDetails: any = await Emotion.findById(turn.emotionSelectedId).populate('category');
    console.log('emotionDetails', emotionDetails);

    // let rewardCoins;

    if (params.emotionSelectedId == null || params.emotionSelectedName == null) {
      turn.guessResult = {
        result: false,
        guessBy: currentUser._id,
        rewardCoins: rewardCoins,
      };
      let turnResult = await turn.save();
      returnVal.data = { turnResult, message: 'Time Over' };
    } else {
      // Update turn guessResult
      turn.guessResult = {
        result: params.result,
        selectedEmotionId: params.emotionSelectedId,
        emotionSelectedName: params.emotionSelectedName,
        comment: params.comment,
        guessBy: currentUser._id,
        rewardCoins: emotionDetails.category.rewardCoin,
      };
      let turnResult = await turn.save();
      returnVal.data = { turnResult };
    }

    // updating the streak or breaking it
    // let key = '';
    // let user = '';

    // JSON.stringify(gameDetails.createdBy) == JSON.stringify(this.GameRepo.toObjectId(currentUser._id))
    //   ? ((key = 'createByConfig'), (user = 'createdBy'))
    //   : ((key = 'opponentConfig'), (user = 'opponent'));

    console.log('gameDetails.createdBy ---> ', gameDetails.createdBy);
    console.log('gameDetails.opponent ---> ', gameDetails.opponent);
    console.log('gameDetails.createByConfig ---> ', gameDetails.createByConfig);
    console.log('gameDetails.createByConfig.currentStreak ---> ', gameDetails.createByConfig.currentStreak);
    console.log('gameDetails.createByConfig.longestStreak ---> ', gameDetails.createByConfig.longestStreak);
    console.log('gameDetails.opponentConfig ---> ', gameDetails.opponentConfig);
    console.log('gameDetails.opponentConfig.currentStreak ---> ', gameDetails.opponentConfig.currentStreak);
    console.log('gameDetails.opponentConfig.longestStreak ---> ', gameDetails.opponentConfig.longestStreak);

    let createdBy = gameDetails.createdBy != undefined ? gameDetails.createdBy.toString() : '';
    let opponent = gameDetails.opponent != undefined ? gameDetails.opponent.toString() : '';

    // let userDetails = await this.UserRepo.findById(gameDetails[user]);
    // console.log("userDetails",userDetails);

    if (currentUser._id == createdBy) {
      if (params.result) {
        gameDetails.createByConfig.currentStreak += 1;

        if (gameDetails.createByConfig.currentStreak > gameDetails.createByConfig.longestStreak)
          gameDetails.createByConfig.longestStreak = gameDetails.createByConfig.currentStreak;

        let user = await User.findById({ _id: createdBy });
        console.log('createdby user ---> ', user);

        if (gameDetails.createByConfig.longestStreak > user.maxStreak)
          user.maxStreak = gameDetails.createByConfig.longestStreak;

        console.log('user.coins before ---> ', user.coins);
        console.log(' emotionDetails.category.rewardCoin ---> ', emotionDetails.category.rewardCoin);
        user.coins += emotionDetails.category.rewardCoin;
        await user.save();
        console.log('user.coins after', user.coins);
      } else {
        gameDetails.createByConfig.currentStreak = 0;

        gameDetails.opponentConfig.currentStreak += 1;

        if (gameDetails.opponentConfig.currentStreak > gameDetails.opponentConfig.longestStreak)
          gameDetails.opponentConfig.longestStreak = gameDetails.opponentConfig.currentStreak;

        let user = await User.findById({ _id: opponent });
        console.log('opponent user ---> ', user);

        if (gameDetails.opponentConfig.longestStreak > user.maxStreak)
          user.maxStreak = gameDetails.opponentConfig.longestStreak;

        console.log('user.coins before ---> ', user.coins);
        console.log(' emotionDetails.category.rewardCoin ---> ', emotionDetails.category.rewardCoin);
        user.coins += emotionDetails.category.rewardCoin;
        await user.save();
        console.log('user.coins after', user.coins);
      }
      await gameDetails.save();
    } else if (currentUser._id == opponent) {
      if (params.result) {
        gameDetails.opponentConfig.currentStreak += 1;

        if (gameDetails.opponentConfig.currentStreak > gameDetails.opponentConfig.longestStreak)
          gameDetails.opponentConfig.longestStreak = gameDetails.opponentConfig.currentStreak;

        let user = await User.findById({ _id: opponent });
        console.log('opponent user ---> ', user);

        if (gameDetails.opponentConfig.longestStreak > user.maxStreak)
          user.maxStreak = gameDetails.opponentConfig.longestStreak;

        console.log('user.coins before ---> ', user.coins);
        console.log(' emotionDetails.category.rewardCoin ---> ', emotionDetails.category.rewardCoin);
        user.coins += emotionDetails.category.rewardCoin;
        await user.save();
        console.log('user.coins after', user.coins);
      } else {
        gameDetails.opponentConfig.currentStreak = 0;

        gameDetails.createByConfig.currentStreak += 1;

        if (gameDetails.createByConfig.currentStreak > gameDetails.createByConfig.longestStreak)
          gameDetails.createByConfig.longestStreak = gameDetails.createByConfig.currentStreak;

        let user = await User.findById({ _id: createdBy });
        console.log('createdby user ---> ', user);

        if (gameDetails.createByConfig.longestStreak > user.maxStreak)
          user.maxStreak = gameDetails.createByConfig.longestStreak;

        console.log('user.coins before ---> ', user.coins);
        console.log(' emotionDetails.category.rewardCoin ---> ', emotionDetails.category.rewardCoin);
        user.coins += emotionDetails.category.rewardCoin;
        await user.save();
        console.log('user.coins after', user.coins);
      }
      await gameDetails.save();
      //   user.maxStreak = gameDetails.opponentConfig.longestStreak;

      // user.coins += emotionDetails.category.rewardCoin;
      // await user.save();
    }

    // if (params.result && currentUser._id == opponent) {
    //   gameDetails[key]['currentStreak'] = gameDetails[key]['currentStreak'] + 1;
    //   if (gameDetails[key]['currentStreak'] > gameDetails[key]['longestStreak'])
    //     gameDetails[key]['longestStreak'] = gameDetails[key]['currentStreak'];
    // } else {
    //   gameDetails[key]['currentStreak'] = 0;
    // }

    // if (gameDetails[key]['longestStreak'] > userDetails['maxStreak']) userDetails['maxStreak'] = gameDetails[key]['longestStreak']
    // userDetails['coins'] = userDetails['coins'] + emotionDetails.category.rewardCoin;
    // await userDetails.save()

    // let turnResult = await turn.save();

    // returnVal.data = { turnResult };
    return returnVal;
  }

  public async createNextTurn(
    params: createGameTurn,
    currentUser: TokenUser,
    uploadedFilesParams: any,
  ): Promise<ServiceReturnVal<Object>> {
    const returnVal: ServiceReturnVal<Object> = {};

    const userId = currentUser._id;
    // get opponent details
    let gameDetails = await this.GameRepo.findById(params.gameId);

    // check if the opponent is valid
    if (!gameDetails) {
      returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_404, constants.ERROR_MESSAGES.GAME_NOT_FOUND);
      return returnVal;
    }

    const isCreatedByMe = gameDetails.createdBy && gameDetails.createdBy._id.equals(userId);
    const isOpponentMe = gameDetails.opponent && gameDetails.opponent._id.equals(userId);
    let opponent = isCreatedByMe ? gameDetails.opponent._id : gameDetails.createdBy._id;

    const myTurn =
      (isCreatedByMe && gameDetails.turns.length % 2 === 0) || (isOpponentMe && gameDetails.turns.length % 2 !== 0);
    // console.log('myTurn', myTurn);

    if (!myTurn) {
      returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_404, constants.ERROR_MESSAGES.NOT_YOUR_TURN);
      return returnVal;
    }

    // console.log('request.files', process.env.SPACE_URL + '/' + uploadedFilesParams.Key);
    // prepare turn object
    let turn = {
      turnBy: this.GameRepo.toObjectId(currentUser._id),
      emotionSelectedId: this.GameRepo.toObjectId(params.emotionSelectedId),
      emotionSelectedName: params.emotionSelectedName,
      mediaPath: process.env.SPACE_URL + '/' + uploadedFilesParams.Key,
      emotionSelectedType: params.emotionSelectedType,
      comment: params.comment,
    };
    console.log(turn);

    const user = await this.UserRepo.findById(currentUser._id);
    // console.log();
    console.log('emotionSelectedType', params.emotionSelectedType);
    if (params.emotionSelectedType === 'Easy') {
      user.coins -= 1;
    } else if (params.emotionSelectedType === 'Medium') {
      user.coins -= 2;
    } else if (params.emotionSelectedType === 'Difficult') {
      user.coins -= 3;
    }
    await user.save();

    // create the game update the turn
    let gameTurn = await this.GameTurnRepo.create(turn as unknown as IGameTurns);

    // update game with turn id
    await this.GameRepo.updateOne(params.gameId, { $push: { turns: [gameTurn._id] }, $inc: { turnCount: 1 } });

    gameDetails = await this.GameRepo.findById(params.gameId);

    let notification = <INotification>(<unknown>{
      // notification_by:this.UserRepo.toObjectId(currentUser._id),
      notification_by: this.GameRepo.toObjectId(currentUser._id),
      notification_to: this.GameRepo.toObjectId(params.opponent),
      title: constants.NOTIFICATION_TITILES.NEW_GAME_STARTED,
      turnCount: gameDetails.turnCount,
      message: `${currentUser.firstName} ${currentUser.lastName} has started a new game with you !`,
      type: constants.NOTIFICATION_TYPES.GAME_STRATED,
    });
    this.NotificationRepo.create(notification as unknown as INotification);
    // console.log("creat app notification",notification);

    // create a push notification
    let pushNotificationObj = <Notification>{
      title: constants.NOTIFICATION_TITILES.NEW_GAME_STARTED,
      message: `${currentUser.firstName} ${currentUser.lastName} has started a new game with you !`,
      notification_type: constants.NOTIFICATION_TYPES.GAME_STRATED,
      user_id: params.opponent,
    };

    let oppoent = await this.UserRepo.findById(opponent as any);


    console.log("params.deviceType",params.deviceType);
    let deviceType
    if(params.deviceType){
      deviceType = params.deviceType
    }
    else{
      deviceType = null
    }

    console.log("deviceType",deviceType);
    // send the notification if the oppoent has fcmToken
    if (oppoent.fcmToken) this.AppFunctionRepo.pushNotification(pushNotificationObj, oppoent.fcmToken,deviceType);

    if (!gameTurn) {
      returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_400, constants.ERROR_MESSAGES.COULD_NOT_CREATE_TURN);
      return returnVal;
    }

    returnVal.data = { gameTurn };
    return returnVal;
  }

  public async getTurnData(params: any): Promise<ServiceReturnVal<Object>> {
    const returnVal: ServiceReturnVal<Object> = {};
    const { turnId } = params;
    // Find turn data by turnId
    const turn = await this.GameTurnRepo.findById(turnId);

    if (!turn) {
      returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_400, constants.ERROR_MESSAGES.TURN_NOT_FOUND);
      return returnVal;
    }

    // Return turn data
    returnVal.data = { turn };
    return returnVal;
  }

  public async getLeaderboard(currentUser: TokenUser, param): Promise<ServiceReturnVal<Object>> {
    const returnVal: ServiceReturnVal<Object> = {};
    const { _id, country } = currentUser;
    if (param.type == constants.LEADER_BOARD_FILTER.friends) {
      // Find friends based on createdBy
      const createdByFriends = (await this.GameRepo.getMyGamesList(_id)) as [];

      let id = [];
      createdByFriends.map((d) => {
        id.push(JSON.parse(JSON.stringify(d['createdBy'])));
        id.push(JSON.parse(JSON.stringify(d['opponent'])));
      });

      // Combine and deduplicate friend IDs
      const friendIds = Array.from(new Set([...id]));

      const friendsLeaderboard = await this.UserRepo.sortAndSelect(friendIds, 'desc');

      // Return turn data
      returnVal.data = { friendsLeaderboard };
      return returnVal;
    } else if (param.type == constants.LEADER_BOARD_FILTER.country) {
      // Find friends based on createdBy
      const friendsLeaderboard = await this.UserRepo.sortAndSelectWithCountry(country);
      // Return turn data
      returnVal.data = { friendsLeaderboard };
      return returnVal;
    } else {
      let friendsLeaderboard = await this.UserRepo.findAndSort();
      returnVal.data = { friendsLeaderboard };
      return returnVal;
    }
  }

  public async getStats(currentUser: TokenUser): Promise<ServiceReturnVal<Object>> {
    const returnVal: ServiceReturnVal<Object> = {};
    const { _id } = currentUser;

    // Find friends based on createdBy
    const user = await this.UserRepo.findById(_id);
    let coins = user.coins;
    let streak = user.maxStreak;

    // let numberOfGames = await this.GameRepo.count({
    //   $or: [{ createdBy: _id }, { opponent: _id }],
    // });
    console.log('user', user);

    let easyWins = 0;
    let gameLose = 0;

    let games = await this.GameRepo.find({
      $or: [{ createdBy: _id }, { opponent: _id }],
    });

    console.log('games.length', games.length);
    let numberOfGames = games.length;

    const allTurnIds = games.flatMap((game) => game.turns);
    console.log('allTurnIds', allTurnIds);

    await Promise.all(
      allTurnIds.map(async (turnId) => {
        let turn = await GameTurn.findById({ _id: turnId });

        console.log('turn', turn);
        if (!turn) {
          console.warn(`Turn not found for id: ${turnId}`);
        } else if(turn.guessResult != null && turn.guessResult != undefined) {
          console.log('turn.guessResult ---> ', turn.guessResult);
          //   if(turn['turnBy'] != undefined && turn['turnBy'].toString() == _id) {
          //     if(turn['guessResult']['result']) gameLose++;
          //     else easyWins++;
          //   } else if(turn['guessResult']['guessBy'] != undefined && turn['guessResult']['guessBy'].toString() == _id) {
          //     if(turn['guessResult']['result']) easyWins++;
          //     else gameLose++;
          //   }
          // }));
          console.log('turn.turnBy ---> ', turn.turnBy);
          console.log('turn.turnBy.toString() == _id ---> ', turn.turnBy.toString() == _id);
          console.log('_id ---> ', _id);
          console.log('turn.turnBy.equals(_id) ---> ', turn.turnBy.equals(_id));

          if (turn.turnBy != null && turn.turnBy.equals(_id)) {
            if (turn.guessResult.result) gameLose++;
            else if(turn.guessResult.result == false) easyWins++;
          } else if (turn.guessResult.guessBy != null && turn.guessResult.guessBy.equals(_id)) {
            if (turn.guessResult.result) easyWins++;
            else if(turn.guessResult.result == false) gameLose++;
          }
        }
      }),
    );

    console.log('easyWins ---> ', easyWins);
    console.log('gameLose ---> ', gameLose);

    // Return turn data
    returnVal.data = { coins, streak, numberOfGames, easyWins, gameLose };
    // returnVal.data = { coins, streak, numberOfGames, easyWins, gameLose };
    // console.log("returnVal.data ---> ", returnVal.data);
    return returnVal;
  }

  public async getStat(currentUser: TokenUser, params): Promise<ServiceReturnVal<Object>> {
    const returnVal: ServiceReturnVal<Object> = {};
    const { _id } = currentUser;
    // console.log('_id ---> ', _id);
    console.log('currentUser ---> ', currentUser);
    // console.log('params.gameId ---> ', params.gameId);

    const user = await this.UserRepo.findById(_id);
    let coins = user.coins;
    // let streak = user.maxStreak;

    let easyWins = 0;
    let gameLose = 0;
    let numberOfGames = 0;
    let streak = 0;
    let tempStreak = 0;

    // const gameData = await Game.find({_id:params.gameId});
    // console.log("gameData ---> ", gameData);

    try {
      const game = await this.GameRepo.find({ _id: params.gameId });
      console.log('game ---> ', game);
      numberOfGames = game.length;

      if (game != null && game != undefined && game.length > 0 && game[0].turnCount > 0 && game[0].turns.length > 0) {
        const turns = await Promise.all(
          game[0].turns.map(turnId => GameTurn.findById({ _id: turnId }))
        );
      
        turns.forEach(turn => {
          console.log("turn ---> ", turn);
          if (!turn) {
            console.warn(`Turn not found for id: ${turn._id}`);
          } else if (turn.guessResult != null && turn.guessResult != undefined) {
            if (turn.turnBy != null && turn.turnBy.equals(_id)) {
              if (turn.guessResult.result) {
                gameLose++;
                if (streak < tempStreak) streak = tempStreak;
                tempStreak = 0;
              } else if (turn.guessResult.result == false) {
                tempStreak++;
                easyWins++;
              }
            } else if (turn.guessResult.guessBy != null && turn.guessResult.guessBy.equals(_id)) {
              if (turn.guessResult.result) {
                tempStreak++;
                easyWins++;
              } else if (turn.guessResult.result == false) {
                gameLose++;
                if (streak < tempStreak) streak = tempStreak;
                tempStreak = 0;
              }
            }
          }
          console.log("tempStreak ---> ", tempStreak);
          console.log("streak ---> ", streak);
        });
      
        console.log("---------------------------");
        if (streak < tempStreak) streak = tempStreak;
        console.log("tempStreak ---> ", tempStreak);
        console.log("streak ---> ", streak);
      }
      
    } catch (e) {
      console.log(e);
    }

    // if(gameData)
    // Return turn data
    // returnVal.data = { coins, streak, 1, easyWins, gameLose };
    returnVal.data = { coins, streak, numberOfGames, easyWins, gameLose };
    // returnVal.data = { coins, streak, numberOfGames, easyWins, gameLose };
    return returnVal;
  }

  public async reduceCoins(currentUser: TokenUser, lifeline: any): Promise<ServiceReturnVal<Object>> {
    const returnVal: ServiceReturnVal<Object> = {};
    const { _id } = currentUser;

    // Find user's coin balance
    const user = await this.UserRepo.findById(_id);

    // Determine the amount to reduce based on lifeline type
    let reduceChops = 0;
    switch (lifeline.lifelineType) {
      case '50_50':
        reduceChops = 10;
        break;
      case 'DOUBLE_DIP':
        reduceChops = 20;
        break;
      case 'DEFINE_WORD':
        reduceChops = 30;
        break;
      default:
        returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_400, 'Invalid lifeline type');
        return returnVal;
    }

    // Check if user has enough coins
    if (user.chops < reduceChops) {
      returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_404, constants.ERROR_MESSAGES.INSUFFICIENT_CHOPS);
      return returnVal;
    }

    console.log('reduceChops', reduceChops);

    // Check if user has enough chops

    // Deduct coins from user
    user.chops -= reduceChops;
    await user.save();

    returnVal.data = {
      code: 200,
      status: true,
      message: `${reduceChops} Chops reduced successfully`,
      coins: user.coins,
      chops: user.chops,
    };

    // Return turn data
    // returnVal.data = { allow: true };
    return returnVal;
  }

  public async addCoins(
    currentUser: TokenUser,
    is_point_increased: number,
    points: number,
    type: string,
    is_purchased_chops_by_coin: number,
  ): Promise<ServiceReturnVal<Object>> {
    const returnVal: ServiceReturnVal<Object> = {};
    const { _id } = currentUser;

    try {
      const user = await this.UserRepo.findById(_id);

      if (type === 'coin') {
        if (is_purchased_chops_by_coin == 0) {
          if (is_point_increased == 1) {
            //increase coins
            user.coins += points;
            returnVal.data = {
              code: 200,
              status: true,
              message: 'Coins added successfully',
              coins: user.coins,
              chops: user.chops,
            };
          } else {
            // reduce coins
            if (user.coins < points) {
              throw new Error('Insufficient coins');
            }
            console.log('Points', points);
            console.log('user.coins', user.coins);

            user.coins = user.coins - points;
            returnVal.data = {
              code: 200,
              status: true,
              message: 'Coins reduced successfully',
              coins: user.coins,
              chops: user.chops,
            };
          }
        } else if (is_purchased_chops_by_coin == 1) {
          // purchase chops by coins
          // update the number of chops based on the coins spent
          if (is_point_increased == 0) {
            if (user.coins < points) {
              throw new Error('Insufficient coins');
            } else if (points == 400) {
              user.chops += 10;
              user.coins -= points;
            } else if (points == 720) {
              user.chops += 20;
              user.coins -= points;
            } else if (points == 1600) {
              user.chops += 50;
              user.coins -= points;
            } else {
              throw new Error('Invalid coins for purchasing chops');
            }
            returnVal.data = {
              code: 200,
              status: true,
              message: 'Chops increased successfully',
              coins: user.coins,
              chops: user.chops,
            };
          }
        }
      } else if (type == 'chop' && is_point_increased == 1 && is_purchased_chops_by_coin == 0) {
        // if purchase chops
        // add your logic for purchasing chops here

        user.coins += points;

        returnVal.data = {
          code: 200,
          status: true,
          message: 'Coins added successfully',
          coins: user.coins,
          chops: user.chops,
        };
      } else if (type == 'chop' && is_point_increased == 0 && is_purchased_chops_by_coin == 0) {
        user.chops -= points;

        returnVal.data = {
          code: 200,
          status: true,
          message: 'Chops reduced successfully',
          chops: user.chops,
        };
      }

      await user.save();

      return returnVal;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  public async userProfile(currentUser: TokenUser): Promise<ServiceReturnVal<Object>> {
    const returnVal: ServiceReturnVal<Object> = {};
    const { _id } = currentUser;

    try {
      const user = await this.UserRepo.findById(_id);
      returnVal.data = {
        user,
      };
      return returnVal;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  public async gameresult(currentUser: TokenUser, params: createGame): Promise<ServiceReturnVal<Object>> {
    const returnVal: ServiceReturnVal<Object> = {};
    console.log('Params In Service', params);

    try {
      const { _id } = currentUser;
      const user = await this.UserRepo.findById(_id);
      const username = user.firstName;

      if (!user) {
        returnVal.data = 'User not found';
        return returnVal;
      }

      let opponentDetails;
      if (params.opponent) {
        opponentDetails = await this.UserRepo.findById(params.opponent);
        if (!opponentDetails) {
          returnVal.data = 'Opponent not found';
          return returnVal;
        }
      }

      if (params.gameId === null) {
        returnVal.data = { wins: 0, losses: 0 };
        return returnVal;
      }

      let gameDetails = await this.GameRepo.findById(params.gameId);
      console.log('gameDetails', gameDetails);
      if (!gameDetails) {
        returnVal.data = 'Game not found';
        return returnVal;
      }

      const createdBy = gameDetails.createdBy;
      const opponent = gameDetails.opponent;

      const isCreatedByMe = createdBy.equals(_id);
      const isOpponentMe = opponent.equals(_id);
      const trunsIds = gameDetails.turns;
      console.log('trunsIds', trunsIds);
      let wins = 0;
      let losses = 0;

      if (isCreatedByMe || isOpponentMe) {
        if (trunsIds != null && trunsIds.length > 0) {
          console.log('trunsIds.length ---> ', trunsIds.length);

          await Promise.all(
            trunsIds.map(async (turnsId) => {
              const turn = await this.GameTurnRepo.findById(turnsId);

              console.log('turn ---> ', turn);
              if (!turn) {
                console.warn(`Turn not found for id: ${turnsId}`);
              } else if (turn.guessResult != null && turn.guessResult != undefined) {
                console.log('turn.guessResult ---> ', turn.guessResult);
                if (turn.turnBy.equals(_id)) {
                  if (turn.guessResult.result) losses++;
                  else if (turn.guessResult.result == false) wins++;
                } else {
                  if (turn.guessResult.result) wins++;
                  else if (turn.guessResult.result == false) losses++;
                }
              }
            }),
          );

          returnVal.data = {
            username: username,
            wins: wins,
            losses: losses,
            opponentname: opponentDetails?.firstName || '',
          };
        } else {
          console.log('No turns data found.');
          returnVal.data = 'No turns data found.';
        }
      } else {
        console.log('The user is neither the creator nor the opponent of the game.');
        returnVal.data = 'Unauthorized';
      }
    } catch (error) {
      console.error('Error in gameresult service:', error);
      returnVal.error = error.message || 'An unexpected error occurred';
    }

    return returnVal;
  }

  public async gettype(currentUser: TokenUser, params: createGame): Promise<ServiceReturnVal<Object>> {
    const returnVal: ServiceReturnVal<Object> = {};
    console.log('Params In Service', params);

    try {
      const { _id } = currentUser;
      console.log(_id);
      const user = await this.UserRepo.findById(_id);
      console.log('User', user);
      if (!user) {
        returnVal.data = 'User not found';
        return returnVal;
      }
      const userId = user._id;
      console.log('userId', userId);

      console.log('Params', params.gameId);

      const gameData = await Game.findById(params.gameId);
      // console.log("gameData",gameData);
      console.log('gameData', gameData.createdBy);

      let type;
      if (gameData.createdBy.equals(new mongoose.Types.ObjectId(_id))) {
        type = 'creator';
      } else {
        type = 'opponent';
      }
      returnVal.data = { type };
      return returnVal;
    } catch (error) {
      returnVal.error = error.message || 'An unexpected error occurred';
      return returnVal;
    }
  }

  public async checkgame(currentUser: TokenUser, params: createGame): Promise<ServiceReturnVal<Object>> {
    const returnVal: ServiceReturnVal<Object> = {};
    console.log('Params In Service', params);
    console.log('GameId', params.gameId);

    try {
      const userId = this.GameRepo.toObjectId(currentUser._id);
      const { _id } = currentUser;
      console.log('currentUserId', _id);

      const user = await this.UserRepo.findById(_id);
      const games: any = await this.GameRepo.getMyGames(userId);
      console.log('Games', games);
      const gamesWithTurn = games.map((game) => {
        let turnText = 'Guess';
        if (game.game.turns?.guessResult?.emotionSelectedName) turnText = 'Play';
        return { turnText };
      });

      // const gid = params.gameId;
      // const gamedata = await Game.findOne({gid}).populate('turns');
      const gamedata = await Game.findById(params.gameId).populate('turns');
      console.log('gamedata', gamedata);
      let turnBy: boolean;

      if (gamedata) {
        if (gamedata.turns != null && gamedata.turns.length > 0) {
          const lastTurnId = gamedata.turns[gamedata.turns.length - 1];
          console.log('lastTurn', lastTurnId);

          const turnData = await GameTurn.findOne(lastTurnId);

          console.log('turnBy', turnData.turnBy);

          // const temp = new mongoose.Types.ObjectId(turnData.turnBy);
          // console.log('mongoose id', temp.toString());
          // console.log('mongoose id', turnData.turnBy.toString() === _id);

          if (turnData.turnBy != undefined && turnData.turnBy.toString() === _id) {
            turnBy = false;
          } else {
            turnBy = true;
          }
          console.log('turnBy', turnBy);
          returnVal.data = {
            is_game_created_before: true,
            userdata: user,
            gamedata: gamedata,
            turnBy: turnBy,
            gamesWithTurn: gamesWithTurn,
          };
        }
      } else {
        returnVal.data = { is_game_created_before: false };
      }
    } catch (error) {
      console.error('Error in checkgame:', error);
      returnVal.error = error.message || 'An unexpected error occurred';
    }

    return returnVal;
  }

  public async gamedata(currentUser: TokenUser, params: createGame): Promise<ServiceReturnVal<Object>> {
    const returnVal: ServiceReturnVal<Object> = {};
    console.log('Params In Service', params);
    console.log('params.opponent', params.opponent);
    console.log('currentUser', currentUser);

    try {
      const userId = this.GameRepo.toObjectId(currentUser._id);
      const { _id } = currentUser;
      console.log('currentUserId', _id);

      const user = await this.UserRepo.findById(_id);
      const games: any = await this.GameRepo.getMyGames(userId);
      console.log('Games', games);
      const gamesWithTurn = games.map((game) => {
        let turnText = 'Guess';
        if (game.game.turns?.guessResult?.emotionSelectedName) turnText = 'Play';
        return { turnText };
      });
      // const user = await this.UserRepo.findById(_id);

      const game = await Game.findOne({
        $or: [
          { createdBy: _id, opponent: params.opponent },
          { createdBy: params.opponent, opponent: _id },
        ],
      }).populate('turns');

      if (!game) {
        returnVal.data = { game: null, flag: false }; // Game not found, return null
      } else {
        returnVal.data = { userdata: user, game: game, gamesWithTurn: gamesWithTurn, flag: true }; // Game found, return game data
      }
    } catch (error) {
      console.error('Error in gamedata:', error);
      returnVal.error = error.message || 'An unexpected error occurred';
    }

    return returnVal;
  }
}
