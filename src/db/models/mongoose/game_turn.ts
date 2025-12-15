import mongoose, { Types } from 'mongoose';

export interface IGameTurns extends mongoose.Document {
    lastTurn: any;
    turn_by : Types.ObjectId;
    turnBy : Types.ObjectId;
    emotion_selected_id : Types.ObjectId ;
    media_path : string ;
    emotionSelectedName : string,
    emotionSelectedType: string,
    comment?: string ;
    guessResult? : IGuessResult;
}

export interface IGuessResult {
  result: boolean;
  selectedEmotionId: Types.ObjectId;
  emotionSelectedName: string;
  rewardCoins: number;
  guessBy: Types.ObjectId;
}

let Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;

//Validation match
/**
 * game schema for mangoose
 * @type {Schema}
 */

let GameTurnSchema = new Schema(
  {
    turnBy : { type: ObjectId, ref: 'User',required: true },
    emotionSelectedId: { type: ObjectId, ref: 'Emotion' ,required: true},
    emotionSelectedName:{type: String},
    mediaPath: { type : String },
    emotionSelectedType:{type: String},
    comment: {type : String},
    guessResult : {
      result : {type : Boolean},
      selectedEmotionId : { type: ObjectId, ref: 'Emotion' },
      emotionSelectedName:{type: String},
      comment : { type : String },
      rewardCoins : { type : Number },
      guessBy : { type: ObjectId, ref: 'User' }
    },
  },
  { timestamps: true }
);


const GameTurn: mongoose.Model<IGameTurns> = mongoose.models.GameTurn || mongoose.model<IGameTurns>('GameTurn', GameTurnSchema);

export default GameTurn;
