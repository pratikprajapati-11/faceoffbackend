import mongoose,{ Types } from 'mongoose';

export interface INotification extends mongoose.Document {
    notification_to : Types.ObjectId , 
    notification_by: Types.ObjectId;
    title : string ;    
    turnCount : number ;    
    message : string ;    
    read_status? : boolean ;    
    type : string ;    
}

let Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;
//Validation match
/**
 * game schema for mangoose
 * @type {Schema}
 */

let NotificationSchema = new Schema(
  {
    notification_by: {type : ObjectId, ref : 'User',required : true},
    notification_to : {type : ObjectId, ref : 'User',required : true},
    turnCount:{type:Number},
    title : {type : String},
    message : {type : String},
    read_status : {type : Boolean,default: true},
    type : {type : String}
  },
  { timestamps: true }
);


const Notification : mongoose.Model<INotification> = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;






// import mongoose, { Schema, Types } from 'mongoose';

// Import the IUser interface from the user model
// import { IUser } from './userModel';
// import {IUser} from './user';

// export interface INotification extends mongoose.Document {
//     notification_to: Types.ObjectId;
//     notification_by: Types.ObjectId;
//     title: string;
//     message: string;
//     read_status?: boolean;
//     type: string;
//     // Define user details
//     sender: IUser['_id'];
//     receiver: IUser['_id'];
// }

// // Define the notification schema
// const NotificationSchema = new Schema(
//     {
//         notification_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
//         notification_to: { type: Schema.Types.ObjectId, ref: 'User', required: true },
//         title: { type: String },
//         message: { type: String },
//         read_status: { type: Boolean, default: true },
//         type: { type: String },
//         // Define user details schema
//         sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
//         receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true }
//     },
//     { timestamps: true }
// );

// // Create the Notification model
// const Notification: mongoose.Model<INotification> = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

// export default Notification;
