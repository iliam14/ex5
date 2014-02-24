/**
 * Created by Ilia Merin on 13/02/14.
 */
var todoLists;

var todoes = {
    get:function(uid){
        return todoLists[uid];
    },
    post:function(uid,itemID,value){
        if(todoLists[uid].hasOwnProperty(itemID))
            return false;
        todoLists[uid][itemID]={};
        todoLists[uid][itemID].value=value;
        todoLists[uid][itemID].complete = false;
        return true;
    },
    put:function(uid,itemID,value,status){
        todoLists[uid][itemID].value=value;
        todoLists[uid][itemID].complete = status;
    },
    delete:function(uid,itemID){
        if(itemID == -1){
            for (ids in todoLists[uid])
            {
                if(todoLists[uid][ids].complete)
                    delete todoLists[uid].ids;
            }
            return true;
        }
        if(todoLists[uid].hasOwnProperty(itemID)){
            delete todoLists[uid][itemID];
            return true;
        }
        return false;

    }


};

module.exports = todoes;