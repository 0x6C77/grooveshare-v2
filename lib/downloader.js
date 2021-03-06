var fs = require('fs'),
    path = require('path'),
    config = require('../config/default.js'),
    Track = require('../models/Track.js'),
    youtuber = require('youtuber'),
    ytdl = require('ytdl-core'),
    ffmpeg = require('ffmpeg');

youtuber = youtuber.default(config.api.youtube.key);



var downloader = {

    get: function(track, save) {
        return this.findSource(track);
    },


    findSource: function(track) {
        return new Promise(function(resolve, reject) {
            downloader.youtube.find(track.title, track.artist).then(function(link) {
                console.log('%s %s %s - %s found', '[downloader]'.green, '[youtube]'.yellow, track.title, track.artist);
                downloader.youtube.download(track, link).then(function(data) {
                    resolve(data);
                }, function(error) {
                    reject(error);
                });
            }, function(error) {
                reject(error);
            });
        });
    },

    youtube: {
        find: function(title, artist, album) {
            return new Promise(function(resolve, reject) {
                youtuber(function(err, details) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(details.youtube_link);
                    }
                }, {
                    title: title,
                    artist: artist
                });
            });
        },

        download: function(track, link) {
            return new Promise(function(resolve, reject) {
                var stream = ytdl(link);

                if (!fs.existsSync(path.join(global.__base, 'data', 'temp'))){
                    fs.mkdirSync(path.join(global.__base, 'data', 'temp'));
                }
                if (!fs.existsSync(path.join(global.__base, 'data', 'music'))){
                    fs.mkdirSync(path.join(global.__base, 'data', 'music'));
                }

                // Get ID
                var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
                var match = link.match(regExp);
                var youtubeID = (match&&match[7].length==11)? match[7] : false;

                var mp4Path = path.join(global.__base, 'data', 'temp', track._id + '.mp4'),
                    mp3Path = path.join(global.__base, 'data', 'music', track._id + '.mp3');

                // Create file from video
                stream.pipe(fs.createWriteStream(mp4Path));

                // Once download has finished
                stream.on('end', function() {
                    // Load in video
                    new ffmpeg(mp4Path).then(function (video) {
                        // Export as mp3
                        video.fnExtractSoundToMP3(mp3Path, function (error, file) {
                            if (!error) {
                                // Delete original mp4
                                fs.unlink(mp4Path);

                                console.log('%s %s %s - %s converted', '[downloader]'.green, '[youtube]'.yellow, track.title, track.artist);

                                // File downloaded
                                resolve({ path: mp3Path, youtube: youtubeID });
                            } else {
                                reject(error);
                            }
                        });
                    }, function (err) {
                        reject(err);
                    });
                });
            });
        }
    }

}

module.exports = downloader;