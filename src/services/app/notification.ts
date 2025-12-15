// import type {
//     UserDetails,
// } from '../types/request/notification';
import {
  // GameRepository,
  NotificationRepository,
  UserRepository,
} from '../../db/repositories';
// , AuthParams 
import { ServiceReturnVal } from '../../types/common';
import { RespError } from '../../lib/wr_response';
// import { INotification } from '../db/models/mongoose/notification';
// import utility from '../lib/utility';
import Base from '../base';
import constants from '../../common/constants';
//   import moment from 'moment';

import notification from "../../db/models/mongoose/notification";
import { TokenUser } from '../../types/request/user';
// import { forEach } from 'lodash';
import Notification from '../../db/models/mongoose/notification';
import mongoose from 'mongoose';
// import { IGameTurns } from '../../db/models/mongoose/game_turn';


export default class NotificationService extends Base {
  private notificationRepo = new NotificationRepository();
  // Notification: any;
  private UserRepo = new UserRepository();
  // private GameRepo = new GameRepository();

  // private userRepo = new UserRepository();
  /**
   * @description Function for registration of users
   * @param {UserDetails}
   * @returns {ServiceReturnVal}
   */
  public async getAllNotifications(params: any, currentUser: TokenUser): Promise<ServiceReturnVal<Object>> {
    const returnVal: ServiceReturnVal<Object> = {};
    console.log("Services Params", params);
    const user = await this.UserRepo.findById(currentUser._id);
    console.log("UserDetails", user);

    // code with sum of turnCount
    // const aggregatedNotifications = await Notification.aggregate([
    //   {
    //     $match: {
    //       notification_by: new mongoose.Types.ObjectId(currentUser._id)
    //     }
    //   },
    //   {
    //     $lookup: {
    //       from: "users",
    //       let: { userId: "$notification_by" },
    //       pipeline: [
    //         {
    //           $match: {
    //             $expr: { $eq: ["$_id", "$$userId"] }
    //           }
    //         },
    //         {
    //           $project: {
    //             _id: 0,
    //             firstName:1,
    //             lastName:1,
    //             username: 1,
    //             photo: 1
    //           }
    //         }
    //       ],
    //       as: "userdata"
    //     }
    //   },
    //   {
    //     $lookup: {
    //       from: "games",
    //       localField: "notification_by",
    //       foreignField: "createdBy",
    //       as: "gamedata",
    //       pipeline: [
    //         {
    //           $project: {
    //             turnCount: 1
    //           }
    //         },
    //         {
    //           $group: {
    //             _id: null,
    //             totalturncount: { $sum: "$turnCount" }
    //           }
    //         }
    //       ]
    //     }
    //   },
    //   {
    //     $addFields: {
    //       user: {
    //         $mergeObjects: [{ $arrayElemAt: ["$userdata", 0] }, { $arrayElemAt: ["$gamedata", 0] }]
    //       }
    //     }
    //   },
    //   {
    //     $project: {
    //       userdata: 0,
    //       gamedata: 0
    //     }
    //   }
    // ]).exec();

   //code that display array of turnCount
    const aggregatedNotifications = await Notification.aggregate([
      {
        $match: {
          notification_to: new mongoose.Types.ObjectId(currentUser._id)
        }
      },
      {
        $lookup: {
          from: "users",          
          foreignField: "_id",
          localField: "notification_by",
          pipeline: [
            // {
            //   $match: {
            //     $expr: { $eq: ["$_id", "$$userId"] }
            //   }
            // },
            {
              $project: {
                _id: 0,
                firstName:1,
                lastName:1,
                username: 1,
                photo: 1
              }
            }
          ],
          as: "userdata"
        }
      },
      // {
      //   $lookup: {
      //     from: "games",
      //     localField: "notification_by",
      //     foreignField: "createdBy",
      //     as: "gamedata",
      //     pipeline: [
      //       {
      //         $project: {
      //           turnCount: 1
      //         }
      //       },
      //     ]
      //   }
      // },
      // {
      //   $addFields: {
      //     user: {
      //       $mergeObjects: [{ $arrayElemAt: ["$userdata", 0] }]
      //     }
      //   }
      // }
      // {
      //   $project: {
      //     userdata: 0,
      //     gamedata: 0
      //   }
      // }
    ]).exec();

     console.log("aggregatedNotifications",aggregatedNotifications);

    returnVal.data = { notifications:aggregatedNotifications };

    return returnVal;
  }

  public async deleteNotification(params: any): Promise<ServiceReturnVal<string>> {
    const returnVal: ServiceReturnVal<string> = {};
    const id = params.notificationId;

    try {
      if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
        returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_400, `You must give a valid id: ${id}`);
        return returnVal
      }
      const result = await notification.deleteOne({ _id: id }).exec();
      console.log("Result Value", result);
      if (result.deletedCount === 0) {
        // If no notification was deleted, check if the notification exists
        const existingNotification = await notification.findById(id).exec();
        if (!existingNotification) {
          returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_404, `Notification with id: ${id} not found`);
        } else {
          // If the notification exists but wasn't deleted, there might be an issue with the deletion process
          returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_400, `Can't delete the notification with id: ${id}`);
        }
      } else {
        returnVal.data = `Notification with id: ${id} deleted with success`;
      }
    } catch (error) {
      returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_500, `An error occurred while deleting the notification: ${error.message}`);
    }

    return returnVal;
  }

  public async deleteAllNotifications(params: any): Promise<ServiceReturnVal<Object>> {
    const returnVal: ServiceReturnVal<Object> = {};

    try {
      const { id } = params;

      if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
        returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_400, `You must give a valid id: ${id}`);
        return returnVal;
      }

      const notificationsDeleteMany = await notification.deleteMany({ user: id });
      if (!notificationsDeleteMany) {
        returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_400, 'Error Deleting all notifications as read');
        return returnVal;
      }

      returnVal.data = `All notifications for user ${id} marked was deleted`;
      return returnVal;
    } catch (error) {
      returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_500, error.message || 'Internal Server Error');
      return returnVal;
    }
  }

  public async markOneNotificationasread(params: any): Promise<ServiceReturnVal<Object>> {
    const returnVal: ServiceReturnVal<Object> = {};
    console.log(" Params : ", params);

    try {
      const { notificationId } = params;
      const id = notificationId;

      if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
        returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_400, `You must give a valid id: ${id}`);
        return returnVal;
      }

      const updateNotification = await notification.findById(id).exec();
      if (!updateNotification) {
        returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_400, 'No notifications found');
        return returnVal;
      }

      updateNotification.read_status = false;
      await updateNotification.save();

      returnVal.data = updateNotification;
      return returnVal;
    } catch (error) {
      returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_500, error.message || 'Internal Server Error');
      return returnVal;
    }
  }

  public async markAllNotificationsAsRead(params: TokenUser): Promise<ServiceReturnVal<Object>> {
    const returnVal: ServiceReturnVal<Object> = {};

    try {
      const { _id } = params;

      if (!_id || !_id.match(/^[0-9a-fA-F]{24}$/)) {
        returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_400, `You must give a valid user`);
        return returnVal;
      }

      const notificationsUpdateMany = await notification.updateMany({ notification_to: this.notificationRepo.toObjectId(_id) }, { $set: { read_status: true } });
      if (!notificationsUpdateMany) {
        returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_400, 'Error Marking all notifications as read');
        return returnVal;
      }

      returnVal.data = `All notifications marked as read`;
      return returnVal;
    } catch (error) {
      returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_500, error.message || 'Internal Server Error');
      return returnVal;
    }
  }


}
