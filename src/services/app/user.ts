import type {
  TokenUser,
  UserDetails,
  updateProfile,
  VerifyHash,
  getUserForGame,
  changePasswordParams,
} from '../../types/request/user';
import { UserRepository, CodesRepository, CountryRepository } from '../../db/repositories';
import { ServiceReturnVal, AuthParams } from '../../types/common';
import { RespError } from '../../lib/wr_response';
import  User, { IUser } from '../../db/models/mongoose/user';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import utility from '../../lib/utility';
import Base from '../base';
import constants from '../../common/constants';
import moment from 'moment';
import Emailer from '../../common/emailer';
// import  ResetTokenModel  from '../../db/models/mongoose/data';
// import ResetTokenModel  from '../../db/models/mongoose/data';
// import { ResetTokenModel } from '../../db/models/mongoose/data';

export default class UserService extends Base {
  // [x: string]: any;
  private userRepo = new UserRepository();
  private countryRepo = new CountryRepository();
  ResetTokenModel: any;
  // User: any;
  /**
   * @description Function for registration of users
   * @param {UserDetails}
   * @returns {ServiceReturnVal}
   */

  public async register(params: UserDetails): Promise<ServiceReturnVal<IUser>> {
    const returnVal: ServiceReturnVal<IUser | any> = {};

    try {
      const isUser: IUser = await this.userRepo.userByEmaiAllDets(params.email);
      const usernameFound: IUser = await this.userRepo.findOne({ username: params.username });

      if (usernameFound) {
        returnVal.error = new RespError(
          constants.RESP_ERR_CODES.ERR_409,
          constants.ERROR_MESSAGES.USERNAME_NOT_AVAILABLE,
        );
        return returnVal;
      }

      if (utility.isEmpty(isUser)) {
        let firstName = '';
        let lastName = '';
        let fullName = '';

        if (params.firstName) {
          firstName = params.firstName;
          if (!params.lastName) {
            const named = params.firstName.split(' ');
            if (named.length > 1) {
              firstName = named[0];
              lastName = named[1];
            }
            fullName = params.firstName;
          } else {
            fullName = `${params.firstName} ${params.lastName}`;
          }
        }
        if (params.lastName) lastName = params.lastName;

        const usr = {
          firstName: firstName,
          lastName: lastName,
          fullName: fullName,
          email: params.email,
          password: params.password,
          fcmToken: params.fcmToken,
          country: params.country,
          dob: params.dob,
          gender: params.gender,
          username: params.username,
          coins: 100,
        };

        if (params.longitude && params.latitude) {
          usr['location'] = {
            type: 'Point',
            coordinates: [params.longitude, params.latitude],
          };
        }

        const user = await this.userRepo.create(usr as unknown as IUser);

        const token = jwt.sign({ ...usr, _id: user._id }, process.env.JWT!, { expiresIn: '24h' });
        returnVal.data = { user: user, token: token };
        console.log('All details of User', user);

        // Send email to the user
        const mailSubject = 'Welcome to Our Platform';
        const templateName = 'welcome_email';
        const locale = {
          // welcomeMessage: "Thank you for signing up to our platform. We're excited to have you on board!"
        };
        await Emailer.sendMail(params.email, mailSubject, templateName, locale);
      } else {
        returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_409, constants.ERROR_MESSAGES.USER_ALREADY_EXIST);
      }
    } catch (error) {
      returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_500, error.message);
    }
    return returnVal;
  }

  /**
   * @description Function for login with email and password
   * @param {UserDetails}
   * @returns {ServiceReturnVal}
   */
  public async login(params: UserDetails): Promise<ServiceReturnVal<Object>> {
    const returnVal: ServiceReturnVal<Object> = {};

    try {
        //update the user deviceType
        if(params.deviceType){
          await User.findOneAndUpdate(
            {email: params.email},
            {deviceType:params.deviceType},
            {new:true}
          )
        }      

      const user = await this.userRepo.findOne({ email: params.email });
      // eslint-disable-next-line no-console
      // If user exists
      if (utility.isEmpty(user)) {
        returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_404, constants.ERROR_MESSAGES.USER_NOT_FOUND);
        return returnVal;
      }

      if (user.type !== constants.ENUMS.LOGIN_TYPE.CUSTOM && user.get('password') === undefined) {
        returnVal.error = new RespError(
          constants.RESP_ERR_CODES.ERR_400,
          constants.ERROR_MESSAGES.FORGOT_PASSWORD_REQUEST,
        );
      } else if (!utility.isEmpty(user) && user.get('password') !== undefined) {
        const match = bcrypt.compareSync(params.password, user.password);
        console.log(':jwt result match : ', match);

        if (!match) {
          returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_401, constants.ERROR_MESSAGES.INVALID_PASSWORD);
          return returnVal;
        }

        const usr = {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          email: user.email,
          photo: user.photo,
          country: user.country,
        };

        const token = jwt.sign(usr, process.env.JWT!, { expiresIn: '24h' });
        const _updateUser = {
          lastActivity: new Date(),
          fcmToken: params.fcmToken,
        };

        if (params.longitude && params.latitude) {
          _updateUser['location'] = {
            type: 'Point',
            coordinates: [params.longitude, params.latitude], // [longitude, latitude]
          };
        }

        user.lastActivity = new Date();
        user.fcmToken = params.fcmToken;
        this.userRepo.updateById(user._id, _updateUser);

        returnVal.data = { user, token: token };
      } else returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_404, constants.ERROR_MESSAGES.USER_NOT_FOUND);
    } catch (error) {
      returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_500, error.message);
    }
    return returnVal;
  }

  /**
   * @description Function for Update Profile
   * @param {changePassword}
   * @returns {ServiceReturnVal}
   */
  public async updateProfile(params: updateProfile, user: TokenUser): Promise<ServiceReturnVal<object>> {
    const returnVal: ServiceReturnVal<object> = {};
    try {
      const usr = await this.userRepo.findById(user._id);
      // console.log("Params",params);

      if (utility.isEmpty(usr)) {
        returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_404, constants.ERROR_MESSAGES.USER_NOT_FOUND);
        return returnVal;
      }

      //If user exists
      usr.lastActivity = new Date();
      usr.save();

      let updateObj = {
        firstName: params.firstName,
        lastName: params.lastName,
        dob: params.dob,
        country: params.country,
      };

      // if (params.dob) {
      //   updateObj.dob = params.dob; // Assuming dob is in the correct format
      // }

      if (params.oldPassword || params.password) {
        const oldPasswordMatch = await bcrypt.compare(params.oldPassword, usr.password);
        const newPasswordMatch = await bcrypt.compare(params.password, usr.password);
        if (!oldPasswordMatch) {
          returnVal.error = new RespError(
            constants.RESP_ERR_CODES.ERR_422,
            constants.ERROR_MESSAGES.PASSWORD_NOT_MATCHED,
          );
        } else if (newPasswordMatch) {
          returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_422, constants.ERROR_MESSAGES.SAME_OLD_PASSWORD);
        }
        updateObj['password'] = await bcrypt.hash(params.password, 10);
      }

      let data = await this.userRepo.updateById(user._id, updateObj);
      returnVal.data = data;
    } catch (error) {
      returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_500, error.message);
      return returnVal;
    }
    return returnVal;
  }

  /**
   * @description Function for update user profile
   * @param {UserDetails}
   * @returns {ServiceReturnVal}
   */
  public async update(params: UserDetails, user: TokenUser): Promise<ServiceReturnVal<IUser>> {
    const returnVal: ServiceReturnVal<IUser> = {};
    try {
      const usr = await this.userRepo.findOne({ _id: user._id });
      if (!utility.isEmpty(usr)) {
        returnVal.data = await this.userRepo.update(usr._id, params as unknown as IUser);
      } else {
        returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_404, constants.ERROR_MESSAGES.USER_NOT_FOUND);
      }
    } catch (error) {
      returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_500, error.message);
    }
    return returnVal;
  }

  /**
   * @description Function for social auth (google and facebook)
   * @param {AuthParams}
   * @returns {ServiceReturnVal}
   */
  public async socialLogin(params: AuthParams): Promise<ServiceReturnVal<object>> {
    const returnVal: ServiceReturnVal<object> = {};
    try {
      let user = await this.userRepo.updateByEmail(params.email, {
        photo: params.photo,
        lastActivity: new Date(),
      } as unknown as IUser);

      // if a new user
      if (utility.isEmpty(user)) {
        // check if username already exist
        const usernameFound: IUser = await this.userRepo.findOne({ username: params.username });

        if (usernameFound) {
          returnVal.error = new RespError(
            constants.RESP_ERR_CODES.ERR_409,
            constants.ERROR_MESSAGES.USERNAME_NOT_AVAILABLE,
          );
          return returnVal;
        }

        let userObj = {
          email: params.email,
          firstName: params.firstName,
          lastName: params.lastName,
          fullName: params.lastName ? `${params.firstName} ${params.lastName}` : params.firstName,
          photo: params.photo,
          type: params.type,
          socialId: params.socialId,
          lastActivity: new Date(),
          fcmToken: params.fcmToken,
          username: params.username,
          dob: params.dob,
          gender: params.gender,
          country: params.country,
          password: params.password,
          coins: 100,
        };

        if (params.longitude && params.latitude) {
          userObj['location'] = {
            type: 'Point',
            coordinates: [params.longitude, params.latitude], // [longitude, latitude]
          };
        }

        user = await this.userRepo.create(userObj as unknown as IUser);
      }

      const usr = {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        photo: user.photo,
        socialId: params.socialId,
        fcmToken: params.fcmToken,
        country: params.country,
      };

      if (params.longitude && params.latitude) {
        usr['location'] = {
          type: 'Point',
          coordinates: [params.longitude, params.latitude], // [longitude, latitude]
        };
      }

      const _updateUser = { lastActivity: new Date(), fcmToken: params.fcmToken };
      this.userRepo.updateById(user._id, _updateUser);
      const token = jwt.sign(usr, process.env.JWT!, { expiresIn: '24h' });
      returnVal.data = { user, token: token };
    } catch (error) {
      returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_500, error.message);
    }
    return returnVal;
  }

  /**
   * Function to send reset password link
   *
   * @param {UserDetails}
   * @returns {ServiceReturnVal}
   */
  public async resetpassword(params): Promise<ServiceReturnVal<object>> {
    const returnVal: ServiceReturnVal<object> = {};
    try {
      console.log('Params', params);
      console.log('Email', params.email);
      // const decodedToken = jwt.verify(params.token, process.env.JWT);
      // console.log("decodedToken",decodedToken);

      const user = await this.userRepo.findOne({ email: params.email });
      // const {email,token,newPassword,confirmPassword} = params

      // const userdata = await this.ResetTokenModel.findOne({email: params.email})
      // console.log("userdata",userdata);

      if (params.newPassword !== params.confirmPassword) {
        returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_422, constants.ERROR_MESSAGES.PASSWORDS_NOT_MATCH);
        return returnVal;
      }

      user.password = params.newPassword;
      await user.save();

      // returnVal.data = {params,user, message: 'Password changed successfully' };

      returnVal.data = { message: 'Password changed successfully' };
    } catch (error) {
      returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_500, error.message);
    }
    return returnVal;
  }

  public async forgotPassword(params: UserDetails): Promise<ServiceReturnVal<string>> {
    const returnVal: ServiceReturnVal<string> = {};
    try {
        const codesRepo = new CodesRepository();
        const user = await this.userRepo.findOne({ email: params.email });

        if (utility.isEmpty(user)) {
            returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_404, constants.ERROR_MESSAGES.USER_NOT_FOUND);
            return returnVal;
        }

        // Deactivate old reset password codes if any
        await codesRepo.deactiveOldCodes(params.email, constants.ENUMS.HASH_TYPES.RESET_PASSWORD);

        // Generate a new hash for the reset link
        const hash = utility.hash(12);
        await codesRepo.add(hash, constants.ENUMS.HASH_TYPES.RESET_PASSWORD, undefined, params.email);

        // Prepare the reset URL
      //  const resetUrl = `http://localhost:5000/${constants.DEEPLINK_PATH.RESET_PASSWORD}?hash=${hash}`;
       const resetUrl = `https://api.eqselfiegame.com/${constants.DEEPLINK_PATH.RESET_PASSWORD}?hash=${hash}`;

        // Create the email content using a string template
        const emailContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Password Reset</title>
            </head>
            <body>
                <p>
                    We've received a request to reset your password. To reset your password, click the link below.
                </p>
                <p>
                    <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #f7d62f; color: #050505; text-decoration: none; border-radius: 5px; font-weight: bold;">
                        Reset Password
                    </a>
                </p>
                <p>
                    This link will expire in 24 hours.
                </p>
                <p>
                    If you didn't request this action, you can ignore this email.
                </p>
                <p>
                    Cheers,<br>
                    Team FaceOff
                </p>
            </body>
            </html>
        `;

        // Send email using Emailer class
        await Emailer.sendMail(
            params.email,
            constants.NODEMAILER.MAIL_SUBJECT.PASSWARD_CHANGE,
            emailContent
        );

        returnVal.data = constants.SUCCESS_MESSAGES.EMAIL_SEND;
    } catch (error) {
        returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_500, error.message);
    }
    return returnVal;
}

  public async resetPassRoute(params): Promise<ServiceReturnVal<string>> {
    const returnVal: ServiceReturnVal<string> = {};
    try {
      const codesRepo = new CodesRepository();
      console.log("codesRepo",codesRepo);
      console.log("params",params);
    //  returnVal.data = {data:codesRepo}
    } catch (error) {
      returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_500, error.message);
    }
    return returnVal;
  }
  
  public async resetNewPassword(params,password): Promise<ServiceReturnVal<string>> {
    const returnVal: ServiceReturnVal<string> = {};
    try {
      const codesRepo = new CodesRepository();
      // const userRepo = new UserRepository();

     console.log("codesRepo",codesRepo);
     console.log("params",params);
     console.log("password in controller",password);

    // Check if the hash exists and is valid
    const codeInfo = await codesRepo.getCodeInfo(params, 'RESET_PASSWORD');
    if (codeInfo == null) 
      returnVal.data = 'Invalid or expired password reset link' 
    
    console.log("codeInfo",codeInfo);

    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("hashedPassword",hashedPassword);
    

    const userEmail =  codeInfo.email;

    // const user = await userRepo.findOneAndUpdate({email: userEmail},{password:hashedPassword});
    const user = await User.findOneAndUpdate(
      {email: userEmail},
      {password:hashedPassword},
      {new:true}
    );

    if (!user) {
      returnVal.data = 'User not found or unable to update password';
      return returnVal;
    }

    // user.password = "sd\\";
    // await user.save();
    console.log("user",user);
    // Deactivate the used password reset code
    await codesRepo.deactiveCode(params);
     returnVal.data = 'Password updated successfully';

     
    } catch (error) {
      returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_500, error.message);
    }
    return returnVal;
  }

  /**
   * Function to set the password
   *
   * @param {VerifyHash}
   * @returns {ServiceReturnVal}
   */
  public async setPassword(params: VerifyHash): Promise<ServiceReturnVal<string>> {
    let returnVal: any = {};
    try {
      const codesRepo = new CodesRepository();
      const codes = await codesRepo.findOne({ code: params.hash, type: params.type });
      if (!utility.isEmpty(codes)) {
        const createdTime = moment.utc(codes.createdAt);
        const currentTime = moment().utc();
        const diffInTime = currentTime.diff(createdTime, 'hours');
        const expiresIn = constants.ENUMS.HASH_EXPIRES_IN.DEFAULT_EXPIRY;
        if (diffInTime <= expiresIn) {
          const setParams = {};
          if (params.password) {
            const password = await bcrypt.hash(params.password, 10);
            setParams['password'] = password;
          }

          await this.userRepo.updateByEmail(codes.email, setParams as unknown as IUser);
          const user = await this.userRepo.findOne({ email: codes.email });
          const usr = {
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.fullName,
            email: user.email,
            photo: user.photo,
          };
          user.password = undefined;

          const token = jwt.sign(usr, process.env.JWT!, { expiresIn: '24h' });
          user.lastActivity = new Date();
          user.save();
          returnVal['data'] = { user, token: token };
        } else {
          returnVal['error'] = new RespError(constants.RESP_ERR_CODES.ERR_410, constants.ERROR_MESSAGES.HASH_EXPIRED);
        }
        await codesRepo.deactiveCode(params.hash);
      } else {
        returnVal['error'] = new RespError(constants.RESP_ERR_CODES.ERR_404, constants.ERROR_MESSAGES.HASH_NOT_FOUND);
      }
    } catch (error) {
      returnVal['error'] = new RespError(constants.RESP_ERR_CODES.ERR_500, error.message);
    }
    return returnVal;
  }

  public async changePassword(params: changePasswordParams, user: TokenUser): Promise<ServiceReturnVal<object>> {
    const returnVal: ServiceReturnVal<object> = {};
    try {
      const usr = await this.userRepo.findById(user._id);
      console.log('All User Details', usr);
      if (!utility.isEmpty(usr)) {
        // const oldPasswordMatch = await bcrypt.compare(params.newPassword, usr.password);
        // if (!oldPasswordMatch) {
        //   returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_422, constants.ERROR_MESSAGES.PASSWORD_NOT_MATCHED);
        //   return returnVal;
        // }

        if (params.newPassword !== params.confirmPassword) {
          returnVal.error = new RespError(
            constants.RESP_ERR_CODES.ERR_422,
            constants.ERROR_MESSAGES.PASSWORDS_NOT_MATCH,
          );
          return returnVal;
        }

        usr.password = params.newPassword;
        await usr.save();

        returnVal.data = { message: 'Password changed successfully' };
      } else {
        returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_404, constants.ERROR_MESSAGES.USER_NOT_FOUND);
      }
    } catch (error) {
      returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_500, error.message);
    }
    return returnVal;
  }

  public async getUserForGame(params: getUserForGame, currentUser: TokenUser): Promise<ServiceReturnVal<string>> {
    let returnVal: any = {};
    try {
      // const type = params.type;
      // const value = params.value;

      const { type, value } = params;

      let user;
      if (type === constants.USER_SELECION_TYPES.RANDOM) {
        const users = await this.userRepo.aggregate([
          { $match: { _id: { $ne: this.userRepo.toObjectId(currentUser._id) } } },
          { $sample: { size: 1 } },
          { $project: { _id: 1, email: 1, fullName: 1, photo: 1 } },
        ]);
        user = users;
      } else if (type === constants.USER_SELECION_TYPES.EMAIL || type === constants.USER_SELECION_TYPES.USERNAME) {
        const fieldName =
          type === constants.USER_SELECION_TYPES.EMAIL
            ? constants.USER_SELECION_TYPES.EMAIL
            : constants.USER_SELECION_TYPES.USERNAME;
        user = await this.userRepo.find(
          {
            _id: { $ne: this.userRepo.toObjectId(currentUser._id) },
            [fieldName]: { $regex: new RegExp(value, 'i') },
          },
          { _id: 1, email: 1, fullName: 1, photo: 1 },
        );
      }

      returnVal.data = { user };
    } catch (error) {
      returnVal['error'] = new RespError(constants.RESP_ERR_CODES.ERR_500, error.message);
    }
    return returnVal;
  }

  public async countryList(): Promise<ServiceReturnVal<string>> {
    let returnVal: any = {};
    try {
      let countryList = await this.countryRepo.find({});
      returnVal.data = { countryList };
    } catch (error) {
      returnVal['error'] = new RespError(constants.RESP_ERR_CODES.ERR_500, error.message);
    }
    return returnVal;
  }

  public async checkSocialLoginUser(params: AuthParams): Promise<ServiceReturnVal<object>> {
    const returnVal: ServiceReturnVal<object> = {};
    try {
      let userAvailable = false;
      let user = {} as IUser;
      if (params.email) user = await this.userRepo.findOne({ email: params.email });
      else {
        // for facebook login use case | bcz it does not provide the email
        user = await this.userRepo.findOne({ socialId: params.socialId });
      }

      if (!utility.isEmpty(user)) {
        const usr = {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          email: user.email,
          photo: user.photo,
          socialId: params.socialId,
          fcmToken: params.fcmToken,
          country: user.country,
        };

        if (params.longitude && params.latitude) {
          usr['location'] = {
            type: 'Point',
            coordinates: [params.longitude, params.latitude], // [longitude, latitude]
          };
        }

        const _updateUser = { lastActivity: new Date(), fcmToken: params.fcmToken };

        if (params.longitude && params.latitude) {
          _updateUser['location'] = {
            type: 'Point',
            coordinates: [params.longitude, params.latitude], // [longitude, latitude]
          };
        }

        this.userRepo.updateById(user._id, _updateUser);
        const token = jwt.sign(usr, process.env.JWT!, { expiresIn: '24h' });
        returnVal.data = { user, token: token };

        userAvailable = true;
      }
      returnVal.data = { userAvailable, ...returnVal.data };
    } catch (error) {
      returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_500, error.message);
    }
    return returnVal;
  }

  public async getNearByUsers(params: getUserForGame, currentUser: TokenUser): Promise<ServiceReturnVal<string>> {
    let returnVal: any = {};
    try {
      // const { type, value } = params;
      console.log('params : ', params);

      const user = await this.userRepo.findById(currentUser._id);
      const latitude = user.location.coordinates[1];
      const longitude = user.location.coordinates[0];

      if (!longitude || !latitude) {
        returnVal['error'] = new RespError(
          constants.RESP_ERR_CODES.ERR_400,
          constants.ERROR_MESSAGES.LOCATION_PERMISSION_DENIED,
        );
      }

      let data = await this.userRepo.getUsersWithinRadius(
        this.userRepo.toObjectId(currentUser._id),
        latitude,
        longitude,
        1000,
      );

      returnVal.data = { data };
    } catch (error) {
      returnVal['error'] = new RespError(constants.RESP_ERR_CODES.ERR_500, error.message);
    }
    return returnVal;
  }
}
