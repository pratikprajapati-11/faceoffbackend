import UserService from '../../services/app/user';
import User from '../../validations/user/user';
import WRRequest from '../../lib/wr_request';
import { Request, Response } from 'express';
import { UserDetails, getUserForGame, VerifyHash, updateProfile, changePasswordParams } from '../../types/request/user';
import { RespError, WRResponse } from '../../lib/wr_response';
import { AuthParams } from '../../types/common';
// const url = require('url');

export default class UserController {
  private service = new UserService();
  private resp = new WRResponse();
  public async register(request: WRRequest<undefined, UserDetails, undefined>, response: Response) {
    const valSchema = new User().getCreateUserVS(false);
    const result = valSchema.validate(request.body);
    if (result.error == null) {
      const resp = await this.service.register(request.body);
      this.resp.resp(response).send(resp);
    } else {
      this.resp.resp(response).error(RespError.validation(result.error.message));
    }
  }
  public async login(request: WRRequest<undefined, UserDetails, undefined>, response: Response) {
    const valSchema = new User().getLoginVS();
    const result = valSchema.validate(request.body);
    if (result.error == null) {
      const resp = await this.service.login(request.body);
      this.resp.resp(response).send(resp);
    } else {
      this.resp.resp(response).error(RespError.validation(result.error.message));
    }
  }
  public async socialLogin(request: WRRequest<undefined, AuthParams, undefined>, response: Response) {
    const valSchema = new User().getAuthVS();
    const params = request.body;
    const result = valSchema.validate(params);
    if (result.error == null) {
      const resp = await this.service.socialLogin(params);
      this.resp.resp(response).send(resp);
    } else {
      this.resp.resp(response).error(RespError.validation(result.error.message));
    }
  }
  public async profileUpdate(request: WRRequest<undefined, updateProfile, undefined>, response: Response) {
    console.log('login user', request);
    const valSchema = new User().getUpdateVS();
    const result = valSchema.validate(request.body);
    const currentUser = request.currentUser;
    if (result.error == null) {
      const resp = await this.service.updateProfile(request.body, currentUser);
      this.resp.resp(response).send(resp);
    } else {
      this.resp.resp(response).error(RespError.validation(result.error.message));
    }
  }

  // public async changePass(request: WRRequest<undefined, changePasswordParams, undefined>,response: Response) {
  //   const valSchema = new User().getChangePasswordVS1();
  //   const params = request.body;

  //   const result = valSchema.validate(request.body);
  //   const currentUser = request.currentUser;
  //   console.log("params",params);
  //   console.log("result",result);
  //   console.log("currentUser",currentUser);
  //   if (result.error == null) {

  //     const resp = await this.service.changePassword(params, currentUser);
  //     console.log("Responce",resp);
  //     this.resp.resp(response).send(resp);
  //   } else {
  //     this.resp.resp(response).error(RespError.validation(result.error.message));
  //   }

  // }

  public async changePass(request: WRRequest<undefined, changePasswordParams, undefined>, response: Response) {
    const valSchema = new User().getChangePasswordVS1();
    const params = request.body;

    const result = valSchema.validate(request.body);
    const currentUser = request.currentUser;
    console.log('params', params);
    console.log('result', result);
    console.log('currentUser', currentUser);
    if (result.error == null) {
      const resp = await this.service.changePassword(params, currentUser);
      console.log('Responce', resp);
      this.resp.resp(response).send(resp);
    } else {
      this.resp.resp(response).error(RespError.validation(result.error.message));
    }
  }

  public async forgotPassword(request: WRRequest<undefined, UserDetails, undefined>, response: Response) {
    const valSchema = new User().verifyEmail();
    const params = request.body;
    const result = valSchema.validate(params);
    if (result.error == null) {
      const result = await this.service.forgotPassword(params);
      this.resp.resp(response).send(result);
    } else {
      this.resp.resp(response).error(RespError.validation(result.error.message));
    }
  }

  public async resetPassRoute(request, response) {
    const hash = request.query.hash;
    // const hash = request.params.hash;
    await this.service.resetPassRoute(hash);
    // response.render('reset-password-form', { hash });
    // this.resp.resp(response).send(result);
    const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Password</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background-color: #f0f0f0;
                    text-align: center;
                    margin: 0;
                    padding: 0;
                }
                .container {
                    max-width: 400px;
                    margin: 100px auto;
                    background-color: #fff;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                }
                h2 {
                    color: #333;
                }
                form {
                    display: flex;
                    flex-direction: column;
                }
                label {
                    margin-bottom: 8px;
                    font-weight: bold;
                }
                input[type="password"] {
                    padding: 10px;
                    font-size: 16px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    margin-bottom: 16px;
                }
                button[type="submit"] {
                    padding: 12px 20px;
                    font-size: 16px;
                    background-color: #f7d62f;
                    color: #050505;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: background-color 0.3s ease;
                }
                button[type="submit"]:hover {
                    background-color: #f7d62f;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>Reset Your Password</h2>
                <form action="/reset-password?hash=${hash}" method="POST">
                    <label for="newPassword">New Password:</label>
                    <input type="password" id="newPassword" name="newPassword" required>
                    <br>
                    <button type="submit">Reset Password</button>
                </form>
            </div>
        </body>
        </html>
    `;
    
    // Send the HTML response
    response.status(200).send(htmlContent);
  }

  public async resetNewPassword(request, response: Response) {
    const hash = request.query.hash;
    console.log("hash",hash);
    const newPassword = request.body.newPassword;
    const result = await this.service.resetNewPassword(hash, newPassword);
    console.log(result);
    // response.send(result);
    // response.render('passwordResetSuccess'); // Render success page
    response.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Successful</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f0f0f0;
            text-align: center;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 400px;
            margin: 100px auto;
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          }
          h2 {
            color: #333;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Your Password Updated Successfully</h2>
        </div>
      </body>
      </html>
    `);
  }

  public async forgotpassword(request: Request, response: Response) {
    console.log('Email ---> ', request.query.email);
    console.log('Token ---> ', request.query.token);

    const email = request.query.email;
    const token = request.query.token;

    response.render('indexdata', { email, token });
  }

  // public async resetpassword(request: WRRequest<undefined, updateProfile, undefined>, response: Response) {
  //   const params = request.body;
  //   // const currentUser = request.currentUser
  //   // console.log("currentUser",currentUser);
  //     const resp = await this.service.resetpassword(params);
  //     this.resp.resp(response).send(resp);
  // }

  public async resetpassword(request: any, response: Response): Promise<void> {
    const params = request.body;
    console.log('token', params.token);
    try {
      const resp = await this.service.resetpassword(params);
      if (
        resp.data &&
        typeof resp.data === 'object' &&
        'message' in resp.data &&
        resp.data.message === 'Password changed successfully'
      ) {
        const htmlContent = `
                  <!DOCTYPE html>
                  <html lang="en">
                  <head>
                      <meta charset="UTF-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <title>Password Change Success</title>
                  </head>
                  <body>
                      <h1>Password Changed Successfully</h1>
                  </body>
                  </html>
              `;
        response.setHeader('Content-Type', 'text/html');
        response.status(200).send(htmlContent);
      } else {
        this.resp.resp(response).send(resp);
      }
    } catch (error) {
      // Handle errors
      console.error(error);
      response.status(500).send('Internal Server Error');
    }
  }

  public async setPassword(request: WRRequest<undefined, VerifyHash, undefined>, response: Response) {
    const valSchema = new User().getSetPassword();
    const params = request.body;
    const result = valSchema.validate(params);
    if (result.error == null) {
      const resp = await this.service.setPassword(params);
      this.resp.resp(response).send(resp);
    } else {
      this.resp.resp(response).error(RespError.validation(result.error.message));
    }
  }

  public async getOpponentUser(request: WRRequest<undefined, getUserForGame, undefined>, response: Response) {
    const valSchema = new User().opponentUserVS();
    const params = request.query;
    console.log('params in controller', params);
    const result = valSchema.validate(params);
    if (result.error == null) {
      const currentUser = request.currentUser;
      console.log('currentuser in controller', params);

      const resp = await this.service.getUserForGame(params, currentUser);
      this.resp.resp(response).send(resp);
    } else {
      this.resp.resp(response).error(RespError.validation(result.error.message));
    }
  }

  public async getCountryList(_, response: Response) {
    try {
      const resp = await this.service.countryList();
      this.resp.resp(response).send(resp);
    } catch (error) {
      this.resp.resp(response).error(RespError.validation(error.message));
    }
  }

  public async userExistence(request: WRRequest<undefined, AuthParams, undefined>, response: Response) {
    try {
      const resp = await this.service.checkSocialLoginUser(request.body);
      this.resp.resp(response).send(resp);
    } catch (error) {
      this.resp.resp(response).error(RespError.validation(error.message));
    }
  }

  public async getNearbyUser(request: WRRequest<undefined, AuthParams, undefined>, response: Response) {
    try {
      const resp = await this.service.getNearByUsers(request.body, request.currentUser);
      this.resp.resp(response).send(resp);
    } catch (error) {
      this.resp.resp(response).error(RespError.validation(error.message));
    }
  }
}
