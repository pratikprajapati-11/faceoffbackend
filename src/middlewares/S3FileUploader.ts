import constants from "../common/constants";

const AWS = require('aws-sdk');
// const fs = require('fs');
const path = require('path');
const spacesEndpoint = new AWS.Endpoint('nyc3.digitaloceanspaces.com');
const s3 = new AWS.S3({
    endpoint: spacesEndpoint,
    accessKeyId: process.env.SPACES_KEY,
    secretAccessKey: process.env.SPACES_SECRET
});

export default class S3FileUploader {
    uploadFileToS3(file, callback) {
        const fileName = `${constants.ASSET_FOLDER_PATH.FACEOFF_GAME}/${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`;
        console.log(file);
        console.log(fileName);
        const fileContent = file.buffer;

        const params = {
            Bucket: "faceoffmedia",
            Key: fileName,
            Body: fileContent,
            ACL: 'public-read'
        };

        s3.putObject(params, (err, data) => {
            if (err) {
                callback(err, null,null);
            } else {
                callback(null, data,params);
            }
        });
    }

    upload(req, res, next) {
        if (!req.files || !req.files['media']) {
            return res.status(400).send('No files were uploaded.');
        }

        const file = req.files['media'][0]; // Assuming only one file is uploaded

        this.uploadFileToS3(file, (err, fileName, params) => {
            if (err) {
                console.error('Failed to upload file to S3:', err);
                return res.status(500).send('Failed to upload file to S3');
            }        
            req.uploadedFilesParams = params;
            console.log('File uploaded to S3:', fileName);
            next();
        });
    }
}


module.exports = S3FileUploader;