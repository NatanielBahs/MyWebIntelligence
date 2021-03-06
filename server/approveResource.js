"use strict";

var database = require('../database');
var socialSignals = require('../automatedAnnotation/socialSignals');

var socialSignalTypes = socialSignals.keySeq().toArray();

module.exports = function(resourceId, territoireId, depth){
    // console.log('approve resource', resourceId, territoireId, depth);
    
    return database.ResourceAnnotations.find(territoireId, resourceId)
    .then(function(existingAnnotation){
        // existingAnnotation.approved may be false if the resource was created via a territoire import with annotations
        // in that case do nothing. Otherwise, approve the resource for this territoire.
        if(existingAnnotation.approved !== false){
            return database.ResourceAnnotations.update(
                resourceId, territoireId, null, {approved: true}
            )
            .then(function(){
                return Promise.all(socialSignalTypes.map(function(type){
                    return new Promise(function(resolve, reject){
                        // Need to put space between same annotation types tasks (to prevent IP ban by services)
                        // Need to put space between resources because updates are race-y and lose information
                        // Schedule annotation task for later, so the task is performed later in hope that it will
                        // prevent race conditions when updating the annotation.
                        // Race conditions can happen for automated annotations (which isn't a big deal 
                        // since it's cheap to redo them)
                        // Race conditions can also happen in collision with human annotations which is a BIG deal 
                        // but unlikely enough to be considered acceptable for now.
                        setTimeout(function(){
                            database.Tasks.createTasksTodo(resourceId, territoireId, type, depth)
                                .then(resolve)
                                .catch(function(err){
                                    console.error('annotation create error', err, err.stack);
                                    reject(err)
                                });  
                        }, 3 * 1000 * socialSignalTypes.length);
                    })
                }));
            })
        }
        
    })
    
    
    

}
