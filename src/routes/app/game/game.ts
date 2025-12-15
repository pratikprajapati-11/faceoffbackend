import { Router } from 'express';
import gameController from '../../../controller/app/game';
import S3FileUploader from '../../../middlewares/S3FileUploader';
import multer from 'multer';

const fileUploader = new S3FileUploader();
const upload = multer();

const uploadMiddleware = upload.fields([{ name: 'media', maxCount: 1 }]);

export default class GameRoute {
  public router: Router;
  public controller = new gameController();


  // key: function (_req, file, cb) {
  //   cb(null, Date.now().toString() + '-' + file.originalname);
  // }
  constructor(router: Router) {
    this.router = router;
    this.routes();
  }

  routes() {
    this.router.post('/game/create-game',
    uploadMiddleware, 
    fileUploader.upload.bind(fileUploader),   
    this.controller.createGame.bind(this.controller))

    this.router.post('/game/create-next-turn',
    uploadMiddleware, 
    fileUploader.upload.bind(fileUploader),
    this.controller.createNextTurn.bind(this.controller))

    this.router.get('/game/get-list',this.controller.getGames.bind(this.controller))
    this.router.post('/game/guess-turn',this.controller.guessTurn.bind(this.controller))
    this.router.get('/game/get-turn-data',this.controller.turnData.bind(this.controller))
    this.router.get('/game/get-leaderboard',this.controller.getLeaderboard.bind(this.controller))
    this.router.get('/game/get-statistics',this.controller.getStats.bind(this.controller))
    this.router.post('/game/get-statistic',this.controller.getStat.bind(this.controller))

    this.router.post('/game/use-lifeline',this.controller.useLifeline.bind(this.controller))
    this.router.post('/process-coin',this.controller.addCoins.bind(this.controller))
    this.router.get('/get-user',this.controller.userProfile.bind(this.controller))

    this.router.post('/gameresult',this.controller.gameresult.bind(this.controller))

    this.router.post('/get-type',this.controller.gettype.bind(this.controller))
    this.router.post('/check-game',this.controller.checkgame.bind(this.controller))
    
    this.router.post('/gamedata',this.controller.gamedata.bind(this.controller))

  }
}
