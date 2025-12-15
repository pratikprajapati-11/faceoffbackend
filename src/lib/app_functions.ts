import FCM from 'fcm-node';
var fcm = new FCM(process.env.FIREBASE_SERVER_KEY);
import type { Notification } from './../types/request/notification';

export default class AppFunctions {
  pushNotification = async (notification: Notification, firebaseToken: string, deviceType) => {
    console.log('notification : ', notification, firebaseToken);
    console.log('deviceType', deviceType);

    // const message = {
    //     notification: {
    //       title: title,
    //       body: body,
    //     },
    //     android: {
    //       notification: {
    //         sound: "default",
    //       },
    //       data: {
    //         title: title,
    //         body: body,
    //       },
    //     },
    //     token: token,
    //   };

    // const message = {
    //     to: firebaseToken,
    //     notification: {
    //         title: notification.title,
    //         body : notification.message,
    //         click_action: "default",
    //     },
    //     android: {
    //         notification: {
    //           sound: "default",
    //         },
    //     data: {
    //         profile_id: notification.user_id,
    //         notification_type: notification.notification_type
    //     },
    // },
    //     priority: 1
    // };

    // let message:any;
    // if (deviceType == 'android') {
    //   message = {
    //     to: firebaseToken,
    //     data: {
    //       title: notification.title,
    //       body: notification.message,
    //       click_action: 'default',
    //     },
    //     priority: 'high',
    //   };
    // } else {
    //   message = {
    //     to: firebaseToken,
    //     notification: {
    //       title: notification.title,
    //       body: notification.message,
    //       click_action: 'default',
    //     },
    //     android: {
    //       notification: {
    //         sound: 'default',
    //       },
    //       data: {
    //         profile_id: notification.user_id,
    //         notification_type: notification.notification_type,
    //       },
    //     },
    //     priority: 1,
    //   };
    // }


   
    
  
     const message = {
        to: firebaseToken,
        notification: {
          title: notification.title,
          body: notification.message,
          click_action: 'default',
        },
        data: {
          title: notification.title,
          body: notification.message,
          click_action: 'default',
        },
        android: {
          notification: {
            sound: 'default',
          },
          data: {
            profile_id: notification.user_id,
            notification_type: notification.notification_type,
          },
        },
        priority: 1,
      };
    





    console.log('message', message);
    if (message) {
      fcm.send(message, function (err, response) {
        if (err) {
          console.log('Something has gone wrong!', err);
          return { status: false, response };
        } else {
          console.log('Successfully sent with response: ', response);
          return { status: true, response };
        }
      });
    }
  };
}
