// import type {
//     UserDetails,
// } from '../types/request/notification';
//   import {
//     NotificationRepository
//   } from '../db/repositories';
import { ServiceReturnVal } from '../../types/common';
import { RespError } from '../../lib/wr_response';
//   import { INotification } from '../db/models/mongoose/notification';
import Base from '../base';
import constants from '../../common/constants';
//   import moment from 'moment';
import emotionCategory from "../../db/models/mongoose/emotion_category";
import emotion from "../../db/models/mongoose/emotion";
import readline from 'readline';
import fs from 'fs';
import Emotion from '../../db/models/mongoose/emotion';
import EmotionCategory from '../../db/models/mongoose/emotion_category';

export default class EmotionService extends Base {
  //   private notificationRepo = new NotificationRepository();
       
  /**
   * @description Function for registration of users
   * @param 
   * @returns 
   */
  public async getEmotions(): Promise<ServiceReturnVal<Object>> {

    const returnVal: ServiceReturnVal<Object> = {};
 
    const category = await emotionCategory.find();
    console.log("category",category);

    let emotions = [] ;
    for (let index = 0; index < category.length; index++) {
      const element = category[index];
      // console.log(element);
      const randomEmotion = await emotion.aggregate([
        { $match: { category: element._id } },
        { $sample: { size: 1 } },
      ]);

      console.log("randomEmotion",randomEmotion);

      let coin;
      if(element.name == 'Easy'){
        coin = 1
      }else if(element.name == 'Medium'){
        coin = 2;
      }else if(element.name == 'Difficult'){
        coin = 3;
      }
      
      emotions.push({ _id : element._id,category : { name : element.name ,coin} ,emotions : randomEmotion[0]});
    }

    console.log("emotions",emotions);

    if (!emotions) {
      returnVal.error = new RespError(constants.RESP_ERR_CODES.ERR_400, constants.ERROR_MESSAGES.NO_EMOTION_FOUND);
      return returnVal
    }

    returnVal.data = { emotions };
    return returnVal
  }


  public async addEmotions(): Promise<ServiceReturnVal<Object>> {
    const returnVal: ServiceReturnVal<Object> = {};
    const filePath = 'D:/Hard.txt';

    try {
        const fileStream = fs.createReadStream(filePath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        const lines: string[] = [];

        for await (const line of rl) {
            lines.push(line.trim());
        }

        console.log("lines.length ---> ", lines.length);

        lines.forEach(async line => {
          let data = await Emotion.findOne({name:line});

          let category = await EmotionCategory.find();
          console.log("category",category[2]._id);

          if(!data){
            //save in data
            let addEmotion = new Emotion({
              name:line,
              category: category[2]._id
            })
            console.log("addEmotion",addEmotion);

            await addEmotion.save();
          }
          
          // if(data == null && data == undefined && data == '') {
            // save in db
          // }
          //1. check in db line
        });

        returnVal.data = { lines };
    } catch (error) {
        returnVal.error = error.message;
    }

    return returnVal;
}

}


