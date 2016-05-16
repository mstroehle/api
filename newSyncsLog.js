var xBrowserSync = xBrowserSync || {};
xBrowserSync.API = xBrowserSync.API || {};

/* ------------------------------------------------------------------------------------
 * Class name:  xBrowserSync.API.NewSyncsLog 
 * Description: Provides API for logging new syncs.
 * ------------------------------------------------------------------------------------ */

xBrowserSync.API.NewSyncsLog = function() {
    'use strict';
    
    var Q = require('q');
    var config = require('./config.js');
    var db = require('./db.js');
    
    var clearLog = function() {
        var deferred = Q.defer();
        
        // Remove log entries older than today
        db.newSyncsLog().remove(
            { 
                syncCreated: { 
                    $lt: (new Date(new Date().toJSON().slice(0,10))) 
                }
            },
            function(err, result) {
                if (!!err) {
                    return deferred.reject(err);
                }
                
                deferred.resolve();
            }
        );
        
        return deferred.promise;
    };
    
    var createLog = function(req) {
        var ipAddress = getIpAddress(req);
        
        if (!ipAddress) {
            return;
        }
        
        var newLog = {
            ipAddress: ipAddress,
            syncCreated: new Date()
        };
        
        // Add new log entry
        db.newSyncsLog().save(newLog, function(err, result) {
            if (err) {
                return next(err);
            }
        });
    };
    
    var dailyNewSyncLimitHit = function(req) {
        var ipAddress = getIpAddress(req);
        
        if (!ipAddress) {
            return Q.resolve(false);
        }
        
        var deferred = Q.defer();
        
        // Clear new syncs log of old entries
        clearLog()
            .then(function() {
                // Get number of new syncs created by this ip
                db.newSyncsLog().count(
                    { ipAddress: ipAddress },
                    function(err, count) {
                        if (!!err) {
                            return deferred.reject(err);
                        }
                        
                        deferred.resolve(count >= config.dailyNewSyncLimit);
                    }
                );
            })
            .catch(function(err) {
                deferred.reject(err);
            });
        
        return deferred.promise;
    };
    
    var getIpAddress = function(req) {
        var ipFromConnection, ipFromSocket, ipFromConnSocket, ipFromHeaders;
        
        try {
            ipFromConnection = req.connection.remoteAddress;
        }
        catch(err) { }
        
        try {
            ipFromSocket = req.socket.remoteAddress;
        }
        catch(err) { }
        
        try {
            ipFromConnSocket = req.connection.socket.remoteAddress;
        }
        catch(err) { }
        
        try {
            ipFromHeaders = req.headers['x-forwarded-for'];
        }
        catch(err) { }
        
        return ipFromConnection || ipFromSocket || ipFromConnSocket || ipFromHeaders;
    };
    
    return {
        createLog: createLog,
        dailyNewSyncLimitHit: dailyNewSyncLimitHit
    };
};

module.exports = xBrowserSync.API.NewSyncsLog();