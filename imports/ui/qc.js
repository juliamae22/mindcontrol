import "./qc.html";
import "./colormaps.js"
import {Subjects} from "../api/module_tables.js"
import "../api/publications.js"
import "../api/methods.js"
import "./module_templates.js"

//var staticURL = "http://127.0.0.1:4002/"
var staticURL = "https://dl.dropboxusercontent.com/u/9020198/data/"
var curveColor =  "rgb(255,235,59)"
var pointColor = "rgb(255,0,0)"

papaya.viewer.Viewer.prototype.convertScreenToImageCoordinateX = function (xLoc, screenSlice) {
    return papaya.viewer.Viewer.validDimBounds((xLoc - screenSlice.finalTransform[0][2]) / screenSlice.finalTransform[0][0],
        screenSlice.xDim);
};

papaya.viewer.Viewer.prototype.convertScreenToImageCoordinateY = function (yLoc, screenSlice) {
    return papaya.viewer.Viewer.validDimBounds((yLoc - screenSlice.finalTransform[1][2]) / screenSlice.finalTransform[1][1],
        screenSlice.yDim);
};

var fill_all_points = function(matrix_coor){
    if (matrix_coor){

         var viewer = papayaContainers[0].viewer
         var canvas = viewer.canvas
         var context = canvas.getContext('2d');
         context.strokeStyle = curveColor //"#df4b26";
         context.lineJoin = "round";
         context.lineWidth = 3;
         context.beginPath();
         var prev = {}
         matrix_coor.forEach(function(val, idx, arr){
             var screenCoor = papayaContainers[0].viewer.convertCoordinateToScreen(val);
             if (viewer.intersectsMainSlice(val)){
                 //draw_point(screenCoor, viewer, curveColor, 3)
                 if (idx){
                     context.moveTo(prev.x, prev.y)
                     context.lineTo(screenCoor.x, screenCoor.y);
                     context.closePath();
                     context.stroke();
                 }
                 prev = screenCoor

         }

     })
    }


}

var fill_all_loggedPoints = function(lp){

    if (lp){
        lp.forEach(function(val, idx, arr){
         var screenCoor = papayaContainers[0].viewer.convertCoordinateToScreen(val.matrix_coor);
         var viewer = papayaContainers[0].viewer
         if (viewer.intersectsMainSlice(val.matrix_coor)){
             draw_point(screenCoor, viewer, pointColor, 5)
         }

     })
    }

}

var fill_all = function(template){
    var contours = template.contours.get()
    var lp = template.loggedPoints.get()

    contours.forEach(function(val, idx, arr){fill_all_points(val.matrix_coor) })
    fill_all_loggedPoints(lp)
}

var tmpScreen = []

var logpoint = function(e, template, type){

        //console.log("lets draw some lines")

    var viewer = papayaContainers[0].viewer



    if((e.shiftKey || template.touchscreen.get()) && e.altKey == false ){
        //convert mouse position to matrix space

        var currentCoor = papayaContainers[0].viewer.cursorPosition
        var originalCoord = new papaya.core.Coordinate(currentCoor.x, currentCoor.y, currentCoor.z)
        var screenCoor = new papaya.core.Point(e.offsetX, e.offsetY) //papayaContainers[0].viewer.convertCoordinateToScreen(originalCoord);


        if (template.logMode.get() == "point" && type=="click"){
            //console.log("screne coord is", screenCoor)
            var points = template.loggedPoints.get()
            if (points == null){
                points = []
            }

            var world = new papaya.core.Coordinate();
            papayaContainers[0].viewer.getWorldCoordinateAtIndex(originalCoord.x, originalCoord.y, originalCoord.z, world);

            points.push({matrix_coor: originalCoord, world_coor: world, checkedBy: Meteor.user().username})
            template.loggedPoints.set(points)
            //var color = "rgb(255, 0, 0)"
            //var viewer = papayaContainers[0].viewer

            draw_point(screenCoor, viewer, pointColor, 5)
        }


        else if (type=="mousedown" && template.logMode.get() == "contour"){
            var contours = template.contours.get()
            if (!contours.length){
                contours.push({complete: false, matrix_coor:[], world_coor:[], checkedBy: Meteor.user().username})
            }

            var currentContour = contours[contours.length-1] //OR: selected contour
            if (currentContour.complete){
                contours.push({complete: false, matrix_coor:[], world_coor:[], checkedBy: Meteor.user().username})
                currentContour = contours[contours.length-1]
            }
            template.contours.set(contours)

            //console.log("contour begin")

        }

        else if (type=="mousemove" && template.logMode.get() == "contour"){

            //papayaContainers[0].viewer.cursorPosition isn't updated on mousedrag
            var originalCoord = papayaContainers[0].viewer.convertScreenToImageCoordinate(screenCoor.x, screenCoor.y, viewer.mainImage);

            var contours = template.contours.get()
            var currentContour = contours[contours.length-1]

            if (currentContour){
                if (currentContour.complete==false){

                    currentContour.matrix_coor.push(originalCoord)
                    //currentContour.world_coor.push(world)
                    template.contours.set(contours)


            }



        }}

         else if (type=="mouseup" && template.logMode.get() == "contour"){
             var contours = template.contours.get()
             var currentContour = contours[contours.length-1]
             currentContour.complete = true
             template.contours.set(contours)

         }



    }

    else{
        if (template.logMode.get() == "contour"){
            var contours = template.contours.get()
            if (contours != null){
                var currentContour = contours[contours.length-1]
                if (currentContour != null){
                    currentContour.complete = true
                    template.contours.set(contours)
                    //console.log("ended contour")
                }

            }

        }
    }

    return true

}

var addPapaya = function(data){
    //if (papayaContainers.length == 0){
        if (papayaContainers.length != 0){
            console.log("papayacontainers is", papayaContainers.pop())
        }

    var params = {}
    params["images"] = []
    //params["orthogonal"] = false;
    //console.log("this in the view images rendered template", data)

    for (i=0;i<data.check_masks.length;i++){ //skipped the brainmask
        params["images"].push(staticURL+data["check_masks"][i]+"?dl=0")
    }
        var sLabelledFile = data.check_masks[i-1]
        //console.log(sLabelledFile)
        var oPartsLabelled = sLabelledFile.split("/");
        var sLastPart = oPartsLabelled[oPartsLabelled.length-1];
        //console.log(sLastPart)
        //console.log("cmap", colormap)
        //console.log("customCtab", myCustomColorTable)
        //console.log("maxKeys", _.max(validKeys))


        //params["contextManager"] = new ctxManager();
        params["segmentation.nii.gz?dl=0"] = {lut: new myCustomColorTable(), min:0, max:2035, gradation:false, alpha:0.5}//colormap
        params["showControlBar"] = true
        params["expandable"] = true
        //params["images"] = [staticURL+Rparams.mse+"/nii/"+Rparams.imageFilename+".nii.gz"]
        //console.log("params", params)
        //$("#modal-fullscreen").show()
        papaya.Container.addViewer("viewer", params, function(){
                                        //.modal("show");
                                        //console.log(params)
                                        })
        papaya.Container.allowPropagation = true;
        $("#viewer").on("mousedrag", function(e){console.log("mousedrag")})
        //} //endif
    }

var template_decorator = function(template_instance_value, lp, idx){
    var update_point_note = function(res, val){
            lp[idx]["note"] = val
            //console.log("logged points are", lp)
            //console.log("template instance", template_instance)
            template_instance_value.set(lp)
        }
    return update_point_note
}

var val_mapper = {"-1": "Not Checked", "0": "Fail", "1": "Pass", "2": "Needs Edits", "3": "Edited"}

var class_mapper = {"-1": "warning", "0": "danger",
                    "1": "success", "2": "primary", "3": "info"}


Template.view_images.onCreated(function(){
    this.loggedPoints = new ReactiveVar([])
    this.contours = new ReactiveVar([])
    this.logMode = new ReactiveVar("point")
    this.touchscreen = new ReactiveVar(false)
})

Template.view_images.helpers({

    user: function(){
        Meteor.subscribe('userList')
        return Meteor.users.find({}).fetch()
    },

    loggedPoints: function(){
        return Template.instance().loggedPoints.get()
    },

    loggedContours: function(){
        var contours = Template.instance().contours.get()
        if (contours != null){
            contours.forEach(function(val, idx, arr){val.name = "Curve "+idx})
        }
        return contours
    },

    onPointNote: function(){
        //console.log("poitn note is", this)
        var lp = Template.instance().loggedPoints.get()
        var idx = lp.indexOf(this)
        return  template_decorator(Template.instance().loggedPoints, lp, idx)
    },

    onContourNote: function(){
        //console.log("poitn note is", this)
        var lp = Template.instance().contours.get()
        var idx = lp.indexOf(this)
        return  template_decorator(Template.instance().contours, lp, idx)
    },

    currentMode: function(){
        return Template.instance().logMode.get()
    },

    currentQC: function(){
        return Session.get("currentQC")
    },

    doc: function(){
        var qc = Session.get("currentQC")
        var output = Subjects.findOne({entry_type: qc.entry_type, name: qc.name})
        if (output){
            if (output.quality_check){
            output.quality_check.QC_name = val_mapper[output.quality_check.QC]
            output.quality_check.QC_color = class_mapper[output.quality_check.QC]
            }}

        //console.log("output is", output)
        return output
    },
    modeCSS: function(){
        var logMode = Template.instance().logMode.get()
        //console.log("css, log mode is", logMode)
        var output = {}
        if (logMode == "point"){
            //output["isPoint"] = "in"
            output["pointColor"] = "warning"
            //output["isContour"] = ""
            output["contourColor"] = "default"
        }
        else{
            //output["isContour"] = "in"
            //output["isPoint"] = ""
            output["contourColor"] = "warning"
            output["pointColor"] = "default"
        }
        return output
    },

    isTouch: function(){
      return Template.instance().touchscreen.get()
    }


})

Template.view_images.events({

"submit .new-qc": function(event, template){

        event.preventDefault();
        if (! Meteor.userId()) {
          throw new Meteor.Error("not-authorized");
        }


        form_values = $("#QC_form").serializeArray()
        form_data = {}
        for (i=0;i<form_values.length;i++){
            form_data[form_values[i]["name"]] = form_values[i]["value"]
        }
        //console.log(form_data)
        lp = Session.get("loggedPoints")
        //console.log("this data", this.data)

        var qc = Session.get("currentQC")
        var update = {}
        update["quality_check"] = form_data
        update["checkedBy"] = Meteor.user().username
        update["checkedAt"] = new Date()
        update["loggedPoints"] = template.loggedPoints.get()
        update["contours"] = template.contours.get()

        //console.log("update is", update)

        Meteor.call("updateQC", qc, update, function(error, result){
            $("#closemodal").click()
        })

        //console.log("called updateQC method!")
    },

 "click #viewer": function(event, template){
     logpoint(event, template, "click")
 },

 "click .swapmode": function(event, template){
     var element = event.toElement.className.split(" ")//.slice(1).split("-")
    var idx = element.indexOf("swapmode") + 1
    //console.log("element is", element, "idx of filter is", idx)
    element = element[idx]//.join(" ").split("+")
    //console.log("element is", element)
    //console.log("element is", element)

     var currMode = template.logMode.get()

     template.logMode.set(element)

 },

 "click #touchscreen": function(event, template){
    //var element = event.toElement.className.split(" ")//.slice(1).split("-")
    //var idx = element.indexOf("swapmode") + 1
    //console.log("element is", element, "idx of filter is", idx)
    //element = element[idx]//.join(" ").split("+")
    //console.log("element is", element)
    //console.log("element is", element)

     var currMode = template.touchscreen.get()

     template.touchscreen.set(!currMode)

 },

 "mousemove #papayaContainer0": function(event, template){

     logpoint(event, template, "mousemove")
     fill_all(template)

     //console.log("mousemove")

 },

  "mousedown #papayaContainer0": function(event, template){
     //console.log("mousedown")
     $("#papayaContainer0").off("mousedown")
     //console.log(event)
     logpoint(event, template, "mousedown")
     fill_all(template)
     //console.log("mousemove")

 },

   "mouseup #papayaContainer0": function(event, template){
     logpoint(event, template, "mouseup")
     fill_all(template)
     //console.log("mousemove")

 },

 "click .goto_coor": function(event, template){
     //console.log("clicked a coordinate", this, this.matrix_coor)
     papayaContainers[0].viewer.gotoCoordinate(this.matrix_coor)
     var screenCoor = papayaContainers[0].viewer.convertCoordinateToScreen(this.matrix_coor);
     var viewer = papayaContainers[0].viewer
     draw_point(screenCoor, viewer, pointColor, 5)
     fill_all(template)
 },

 "click .goto_cont": function(event, template){
     //console.log("clicked a coordinate", this, this.matrix_coor)
     papayaContainers[0].viewer.gotoCoordinate(this.matrix_coor[0])
     //console.log("size of contour", this.matrix_coor.length, this.matrix_coor)
     /*this.matrix_coor.forEach(function(val, idx, arr){
         var screenCoor = papayaContainers[0].viewer.convertCoordinateToScreen(val);
         var viewer = papayaContainers[0].viewer
         draw_point(screenCoor, viewer, "rgb(0,0,255)", 3)
     })*/
     fill_all_points(this.matrix_coor)
     fill_all(template)

 },

 "click .remove-point": function(event, template){
     var points = template.loggedPoints.get()
     var idx = points.indexOf(this)
     points.splice(idx, 1)
     template.loggedPoints.set(points)
     fill_all(template)
 },

  "click .remove-contour": function(event, template){
     var points = template.contours.get()
     var idx = points.indexOf(this)
     points.splice(idx, 1)
     template.contours.set(points)
     fill_all(template)
 },

 "click #menu-toggle": function(e, template){
        e.preventDefault();
        $("#wrapper").toggleClass("toggled")/*.promise().done(function(){
            console.log("done toggling", papayaContainers[0].getViewerDimensions(), $("#viewer").height(), $("#viewer").width())
            var viewer = papayaContainers[0].viewer
            viewer.resizeViewer([$("#viewer").width(), $("#viewer").height()])
            });*/

 },
 "click #resize": function(e, template){
     console.log("in resize")
     var viewer = papayaContainers[0].viewer
     viewer.resizeViewer(papayaContainers[0].getViewerDimensions())

 }

})

Template.view_images.rendered = function(){

    if(!this._rendered) {
      this._rendered = true;
      //console.log('Template onLoad');
    }


    this.autorun(function(){
        var qc = Session.get("currentQC")
        //console.log("loggedPoints?", Template.instance().loggedPoints.get())
        //console.log("in autorun, qc is", qc)
        if (qc){
        if (Object.keys(qc).indexOf("entry_type")>=0){
            var output = Subjects.findOne({entry_type: qc.entry_type, name: qc.name},{check_masks:1, _id:0, name:1, loggedPoints: 1, contours: 1})

            if (output){
                Template.instance().loggedPoints.set(output.loggedPoints)
                if (output.contours != null){
                    Template.instance().contours.set(output.contours)
                }
                else{
                    Template.instance().contours.set([])
                }
                addPapaya(output)
            }


        }}

    });//end of autorun



}
