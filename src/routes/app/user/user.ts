import { Router } from 'express';
import UserController from '../../../controller/app/user';
// import {authenticate} from '../../../middlewares/authenticate'
// import s3Helper from '../../lib/s3_helper';
// import multer from 'multer';
// import multerS3 from 'multer-s3';


export default class UserRoute {
  public router: Router;
  public controller = new UserController();
//   private upload = multer({
//     storage: multerS3({
//       s3: s3Helper.s3Client(),
//       bucket: constants.AWS_BUCKET_NAME,
//       acl: 'public-read',
//       key: function (_request, file, cb) {
//         const fileName = `${constants.ASSET_FOLDER_PATH.USER}/${file.fieldname}-${Date.now()}${path.extname(
//           file.originalname
//         )}`;
//         cb(null, fileName);
//       },
//     }),
//   });

  constructor(router: Router) {
    this.router = router;
    this.routes();
  }
  routes() {
    this.router.post('/services/register', this.controller.register.bind(this.controller));
    this.router.post('/services/login', this.controller.login.bind(this.controller));
    this.router.post('/services/social-login', this.controller.socialLogin.bind(this.controller));
    this.router.put('/user/profile-update', this.controller.profileUpdate.bind(this.controller));
    this.router.post('/changepassword', this.controller.changePass.bind(this.controller));
    this.router.post('/services/forgot-password', this.controller.forgotPassword.bind(this.controller));

    //reset password route
    this.router.get('/reset-password', this.controller.resetPassRoute.bind(this.controller));

    //handle form submission for password reset
    this.router.post('/reset-password', this.controller.resetNewPassword.bind(this.controller));


    // this.router.get('/forgot-password', this.controller.forgotpassword.bind(this.controller));
    // this.router.post('/reset-pass', this.controller.resetpassword.bind(this.controller));
  
    this.router.post('/services/set-password', this.controller.setPassword.bind(this.controller));
    this.router.get('/user/get-opponent-user', this.controller.getOpponentUser.bind(this.controller));
    this.router.get('/services/get-countrylist', this.controller.getCountryList.bind(this.controller));
    this.router.post('/services/check-user-existence', this.controller.userExistence.bind(this.controller));
    this.router.post('/user/get-nearby-user', this.controller.getNearbyUser.bind(this.controller));
  }
}
