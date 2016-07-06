import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveDict } from 'meteor/reactive-dict';

//import { Tasks } from '../api/tasks.js';
import { Subjects } from '../api/tasks.js';

import './task.js';
import './body.html';


Template.body.events({
    "click .reset": function(){
        Session.set("globalSelector", {})
        Session.set("subjectSelector", {"subject_id": {$in: []}})
    },
    "click .download": function(){
        MyAppExporter.exportFS()
    },
    "click .tutorial": function(){
        var intro = introJs()
        intro.setOptions({showProgress: false})
        intro.onchange(function(targetElement) {
            console.log(targetElement.attributes.getNamedItem("data-step"))
            if (targetElement.attributes.getNamedItem("data-step") == "2"){
                console.log("in here")
                var gSelector = Session.get("globalSelector")
                gSelector.Exams["DCM_StudyDate"] = "20151123"
                Session.set("globalSelector", gSelector)
            }
        });
        intro.start();
    },
    "click .save": function(){
        var gSelector = Session.get("globalSelector")
        var name = $("#qname").serializeArray()[0]["value"]
        console.log("query name is", name)
        
        Meteor.call("save_query", name, JSON.stringify(gSelector))
    },
    
    "click .remove": function(e){
        var gSelector = Session.get("globalSelector")
        var key = this.col
        delete gSelector[key][this.attr]
        console.log("gSelector is now", gSelector)
        Session.set("globalSelector", gSelector)
    },
    
    "click .removequery": function(e){
        console.log(this.user, this.query, this.name)
        Meteor.call("removeQuery", this.user, this.query, this.name, this._id)
    },
    
    "click .query": function(e){
        console.log(this.user, this.query, this.name)
        Session.set("globalSelector", JSON.parse(this.query))
        
    },
    
    "click .filter": function(e){
        console.log(e)
        var element = e.toElement.className.split(" ")//.slice(1).split("-")
        element = element.slice(1).join(" ").split("+")
        console.log("element is", element)
        var entry_type = element[0]
        var field = element[1]
        var value = element[2]//.slice(2).join(" ")        
        console.log(entry_type, field, value)

        /*var gSelector = Session.get("globalSelector")
        if (Object.keys(gSelector).indexOf(entry_type) < 0){
            gSelector[entry_type] = {}
        }
        gSelector[entry_type][field] = value

        console.log("insert subject selector in this filter function", gSelector)
        

        Session.set("globalSelector", gSelector)*/
        var filter = get_filter(entry_type)
        console.log("filter in .filter is", filter)
        filter[field] = value
        Meteor.call("get_subject_ids_from_filter", filter, function(error, result){
            console.log("result from get subject ids from filter is", result)
            var ss = Session.get("subjectSelector")
            ss["subject_id"]["$in"] = result
            Session.set("subjectSelector", ss)
        })

    },

})

Template.body.helpers({
    currentQuery: function(){
        var gSelector = Session.get("globalSelector")
        return gSelector

    },
        
    savedQueries: function(){
        var user = Meteor.users.findOne(Meteor.userId(), {fields: {username:1}})
        //console.log("user", user)
        //var userentries = User.find({user:user.username})
        //console.log("userentries", userentries)
        //return userentries
    }
    
})
