import gameService from '../../services/app/game';
import Game from '../../validations/game/game';
import WRRequest from '../../lib/wr_request';
import { Response } from 'express';
import {
  createGame, guessTurn , turnData  ,createGameTurn , lifelineType
} from '../../types/request/game';
import { RespError, WRResponse } from '../../lib/wr_response';

export default class GameController {
  private service = new gameService();
  private resp = new WRResponse();
  
  public async createGame(request: WRRequest<undefined, createGame, undefined>, response: Response) {
    const params = request.body;    
    console.log("params",params);
    const valSchema = new Game().getCreateGameVS();
    const result = valSchema.validate(params);
    if (result.error == null) {
      const currentUser = request.currentUser;
      const resp = await this.service.createGame(params,currentUser,request.uploadedFilesParams)
      this.resp.resp(response).send(resp);
    } else {
      this.resp.resp(response).error(RespError.validation(result.error.message));
    }
  }  

  public async createNextTurn(request: WRRequest<undefined, createGameTurn, undefined>, response: Response) {
    const params = request.body;
    const valSchema = new Game().getNextTurnVS();
    const result = valSchema.validate(params);
    if (result.error == null) {
      // params.files = request.files;  
      const currentUser = request.currentUser;
      const resp = await this.service.createNextTurn(params,currentUser,request.uploadedFilesParams)
      this.resp.resp(response).send(resp);
    } else {
      this.resp.resp(response).error(RespError.validation(result.error.message));
    }
  }  

  public async getGames(request: WRRequest<undefined, undefined, undefined>, response: Response) {
    const currentUser = request.currentUser;
    try {
      const resp = await this.service.getGames(currentUser)
      this.resp.resp(response).send(resp);
    } catch (error) {
      this.resp.resp(response).error(RespError.validation(error.message));
    }
  }  

  public async guessTurn(request: WRRequest<undefined, guessTurn , undefined>, response: Response) {
    const params = request.body;
    console.log("guessTurn : controller : ",params );
    
    const valSchema = new Game().getGuessTurnVS();
    const result = valSchema.validate(params);
    if (result.error == null) {
      const currentUser = request.currentUser;
      console.log("Current User",currentUser);
      const resp = await this.service.guessTurn(params,currentUser)
      this.resp.resp(response).send(resp);
    } else {
      this.resp.resp(response).error(RespError.validation(result.error.message));
    }
  }  

  public async turnData(request: WRRequest<undefined, turnData , undefined>, response: Response) {
    const params = request.query;
    const valSchema = new Game().getTurnData();
    const result = valSchema.validate(params);
    if (result.error == null) {
      const resp = await this.service.getTurnData(params)
      this.resp.resp(response).send(resp);
    } else {
      this.resp.resp(response).error(RespError.validation(result.error.message));
    }
  }  

  public async  getLeaderboard(request: WRRequest<undefined, undefined , undefined>, response: Response) {
    const currentUser = request.currentUser;
    const param = request.query;
    try {
      const resp = await this.service.getLeaderboard(currentUser,param)
      this.resp.resp(response).send(resp);
    } catch (error) {
      this.resp.resp(response).error(RespError.validation(error.message));
    }
  }  

  public async  getStats(request: WRRequest<undefined, undefined , undefined>, response: Response) {
    const currentUser = request.currentUser;
    try {
      const resp = await this.service.getStats(currentUser)
      this.resp.resp(response).send(resp);
    } catch (error) {
      this.resp.resp(response).error(RespError.validation(error.message));
    }
  }  

  public async getStat(request: WRRequest<undefined, undefined , undefined> , response: Response) {
    const params = request.body;
    const currentUser = request.currentUser;
    console.log("params",params);
    try {
      const resp = await this.service.getStat(currentUser, params);
      this.resp.resp(response).send(resp);
    } catch (error) {
      this.resp.resp(response).error(RespError.validation(error.message));
    }
  }  


  public async useLifeline(request: WRRequest<undefined, lifelineType , undefined>, response: Response) {
    const params = request.body;
    console.log("params",params);
    // const valSchema = new Game().getLifeLineVS();
    // const result = valSchema.validate(params);
    // if (result.error == null) {
      const currentUser = request.currentUser;
      console.log('currenntuser',currentUser);
      const resp = await this.service.reduceCoins(currentUser,params)
      this.resp.resp(response).send(resp);
    // } else {
      // this.resp.resp(response).error(RespError.validation(result.error.message));
    // }
  }  

public async addCoins(request: any, response: Response) {
  const currentUser = request.currentUser;
  // const { type = 1,coin } = request.body;
  const {is_point_increased,points,type,is_purchesed_chops_by_coin} = request.body
  // console.log("is_point_increased : ", is_point_increased);
  // console.log("points : ",points );
  // console.log("type : ", type);
  // console.log("is_purchesed_chops_by_coin : ", is_purchesed_chops_by_coin);
  try {
      const resp = await this.service.addCoins(currentUser,is_point_increased,parseInt(points),type,is_purchesed_chops_by_coin);
      this.resp.resp(response).send(resp);
      console.log("Responce",resp);
  } catch (error) {
      this.resp.resp(response).error(RespError.validation(error.message));
  }
}

public async userProfile(request: any, response: Response) {
  const currentUser = request.currentUser;
  
  try {
      const resp = await this.service.userProfile(currentUser);
      this.resp.resp(response).send(resp);
      console.log("Responce",resp);
  } catch (error) {
      this.resp.resp(response).error(RespError.validation(error.message));
  }
}


public async gameresult(request: WRRequest<undefined, undefined, undefined>, response: Response) {
  const currentUser = request.currentUser;
  const params = request.body;
  console.log("params in cont",params);
  try {
    const resp = await this.service.gameresult(currentUser,params);
    this.resp.resp(response).send(resp);
  } catch (error) {
    this.resp.resp(response).error(RespError.validation(error.message));
  }
}


public async gettype(request: WRRequest<undefined, undefined, undefined>, response: Response) {
  const currentUser = request.currentUser;
  const params = request.body;
  console.log("params in cont",params);
  try {
    const resp = await this.service.gettype(currentUser,params);
    this.resp.resp(response).send(resp);
  } catch (error) {
    this.resp.resp(response).error(RespError.validation(error.message));
  }
}

public async checkgame(request: WRRequest<undefined, undefined, undefined>, response: Response) {
  const currentUser = request.currentUser;
  const params = request.body;
  console.log("curr",currentUser);
  console.log("params in controller",params);
  try {
    const resp = await this.service.checkgame(currentUser,params);
    this.resp.resp(response).send(resp);
  } catch (error) {
    this.resp.resp(response).error(RespError.validation(error.message));
  }
}

public async gamedata(request: WRRequest<undefined, undefined, undefined>, response: Response) {
  const currentUser = request.currentUser;
  const params = request.body;
  console.log("curr",currentUser);
  console.log("params in controller",params);
  try {
    const resp = await this.service.gamedata(currentUser,params);
    this.resp.resp(response).send(resp);
  } catch (error) {
    this.resp.resp(response).error(RespError.validation(error.message));
  }
}


}
