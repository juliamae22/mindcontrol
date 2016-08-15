import "./qc.js"
curveColor =  "rgb(255,235,59)"
pointColor = "rgb(255,0,0)"

guid = function(){
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

send_to_peers = function(data){
    //console.log("you want to send", data, "to peers")
    var conns = get_open_connections()
    //console.log("cons are", conns)
    data["user"] = Meteor.users.findOne({_id: Meteor.userId()}).username
    /*conns.forEach(function(val, idx, arr){
      val.send(data)  
    })*/
    for(var i =0; i<conns.length;i++){
        var conn = conns[i]
        //console.log("con is", conn)
        conn.send(JSON.stringify(data))
        //console.log("sent?")
    }
}

get_open_connections = function(template_instance){
    var conns = []
    for (var key in peer.connections){
        if (peer.connections[key][0].open){
            conns.push(peer.connections[key][0])
            if (template_instance){
                peer.connections[key][0].on("data", sync_templates_decorator(template_instance))
            }
            }
        }
    return conns
}

var snapToGrid = function(coords){
  out_coords = []
  //console.log("non-snapped", coords)
  coords.forEach(function(val, idx, arr){
    if (idx==0){
        //console.log(val)
        }
    out_coords.push(new papaya.core.Coordinate(Math.round(val.x), Math.round(val.y), Math.round(val.z)))
  })
  //console.log("out coords is", out_coords)
  return out_coords
}

connect_points = function(matrix_coor){
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
                 draw_point(screenCoor, viewer, curveColor, 3)
                 if (idx && prev !=null){
                     context.moveTo(prev.x, prev.y)
                     context.lineTo(screenCoor.x, screenCoor.y);
                     context.closePath();
                     context.stroke();
                 }
                 prev = screenCoor
         }
         else{
           prev = null
         }

     })
    }


}

fill_all_loggedPoints = function(lp){

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

fill_all = function(template){
    var contours = template.contours.get()
    var lp = template.loggedPoints.get()

    contours.forEach(function(val, idx, arr){
        //console.log("in fillall", val)
        if (val.visible==true || val.visible==null){
          val.contours.forEach(function(val, idx, arr){
              connect_points(val.matrix_coor)
              })
        }
        })
    fill_all_loggedPoints(lp)
}

setValue = function(x,y,z, val){
    var viewer = papayaContainers[0].viewer
    var N = viewer.screenVolumes.length
    var vol = viewer.screenVolumes[N-1].volume
    var ori = vol.header.orientation
    var offset = ori.convertIndexToOffset(x,y,z)
    var old_val = vol.imageData.data[offset]
    vol.imageData.data[offset] = val
    return old_val
}

setContoursToZero = function(contours){
    //var contours = template.contours.get()
        
    contours.forEach(function(val, idx, arr){
        //console.log("in fillall", val)
        //console.log(val)
        if (val.visible==true || val.visible==null){
          val.contours.forEach(function(val, idx, arr){
              val.matrix_coor.forEach(function(val, idx, arr){
                  var x = val.x
                  var y = val.y
                  var z = val.z
                  setValue(x,y,z,0)

              })
               
              
              })
        }
    })

}

var annotate_point = function(template, originalCoord, screenCoor){
            var viewer = papayaContainers[0].viewer
            var points = template.loggedPoints.get()
            if (points == null){
                points = []
            }

            var world = new papaya.core.Coordinate();
            papayaContainers[0].viewer.getWorldCoordinateAtIndex(originalCoord.x, originalCoord.y, originalCoord.z, world);
            var entry = {matrix_coor: originalCoord, world_coor: world, checkedBy: Meteor.user().username, uuid: guid()}
            points.push(entry)
            template.loggedPoints.set(points)
            //var color = "rgb(255, 0, 0)"
            //var viewer = papayaContainers[0].viewer

            draw_point(screenCoor, viewer, pointColor, 5)
            //var points = get_stuff_of_user(template, "loggedPoints")
            send_to_peers({"action": "insert", "data":{"loggedPoints": entry}})
}

var start_curve = function(template, originalCoord, screenCoor){
    
    var contours = template.contours.get()
            //console.log("on mousedown, contours is", contours)
    if (!contours.length){
        var entry = {contours: [{complete: false, matrix_coor:[], world_coor:[]}],
                        checkedBy: Meteor.user().username, name:"Drawing 0", uuid: guid()}
        contours.push(entry)
        
        send_to_peers({"action": "insert", "data":{"contours": entry}})
        Session.set('selectedDrawing', 0)
        //console.log("pushed contours", contours)
    }

    var world = new papaya.core.Coordinate();
    papayaContainers[0].viewer.getWorldCoordinateAtIndex(originalCoord.x, originalCoord.y, originalCoord.z, world);
    var selectContour = getSelectedDrawing(template)//contours[contours.length-1].contours //OR: selected contour
    //console.log("selectContours is", selectContour)
    if (selectContour.length == 0){
      selectContour.push({complete: false, matrix_coor:[], world_coor:[]})
    }

    var currentContour = selectContour[selectContour.length-1]
    //console.log("currentContours is", currentContour)

    if (currentContour.complete==true){
        selectContour.push({complete: false, matrix_coor:[], world_coor:[]})
        currentContour = selectContour[selectContour.length-1]
        currentContour.matrix_coor.push(originalCoord)
        currentContour.world_coor.push(world)
    }
    template.contours.set(contours)
    
    send_to_peers({"action": "update", "data":{"contours": getSelectedDrawingEntry(template)}})
    Session.set("isDrawing", true)
            

            //console.log("contour begin")

    
}

var continue_curve = function(template, originalCoord, screenCoor){
                //papayaContainers[0].viewer.cursorPosition isn't updated on mousedrag
            var originalCoord = papayaContainers[0].viewer.convertScreenToImageCoordinate(screenCoor.x, screenCoor.y, viewer.mainImage);
            var world = new papaya.core.Coordinate();
            papayaContainers[0].viewer.getWorldCoordinateAtIndex(originalCoord.x, originalCoord.y, originalCoord.z, world);
            var contours = template.contours.get()

            if (contours.length){
            var selectContour = getSelectedDrawing(template) //contours[contours.length-1].contours
            //console.log("on mousemove", selectContour)
            var currentContour = selectContour[selectContour.length-1]

            if (currentContour){
                if (currentContour.complete==false){

                    currentContour.matrix_coor.push(originalCoord)
                    currentContour.world_coor.push(world)
                    template.contours.set(contours)
                    //send_to_peers({"action": "update", "data":{"contours": getSelectedDrawingEntry(template)}})
                    Session.set("isDrawing", true)

                    }
                }
                }
}

var end_curve = function(template, originalCoord, screenCoor){
            var contours = template.contours.get()
             //console.log("on mouseup, contours is", contours)
             var selectContour = getSelectedDrawing(template) //contours[contours.length-1].contours
             //console.log("on mouseup, selectcontours is", selectContour)

             var currentContour = selectContour[selectContour.length-1]

             //var currentContour = contours[contours.length-1]
             currentContour.complete = true
             //console.log("mouseup", currentContour)
             currentContour.matrix_coor = snapToGrid(currentContour.matrix_coor)
             template.contours.set(contours)
             send_to_peers({"action": "update", "data":{"contours": getSelectedDrawingEntry(template)}})
             //papayaContainers[0].viewer.drawViewer(true)
             Session.set("isDrawing", false)
}

var start_paint = function(template, originalCoord, screenCoor){
    var painters = template.painters.get()
    var world = new papaya.core.Coordinate();
    papayaContainers[0].viewer.getWorldCoordinateAtIndex(originalCoord.x, originalCoord.y, originalCoord.z, world);
    var entry = {matrix_coor: [originalCoord], world_coor: [world], checkedBy: Meteor.user().username, uuid: guid()}
    painters.push(entry)
    template.painters.set(painters)
    Session.set("isDrawing", true)
    var viewer = papayaContainers[0].viewer
    draw_point(screenCoor, viewer, curveColor, 3)
    var canvas = viewer.canvas
    var context = canvas.getContext('2d');
    context.strokeStyle = curveColor //"#df4b26";
    context.lineJoin = "round";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(screenCoor.x, screenCoor.y)
    
}

var continue_paint = function(template, originalCoord, screenCoor){
    var painters = template.painters.get()
    var N = painters.length
    var currentPaint = painters[N-1]
    var viewer = papayaContainers[0].viewer
    var originalCoord = papayaContainers[0].viewer.convertScreenToImageCoordinate(screenCoor.x, screenCoor.y, viewer.mainImage);
    var world = new papaya.core.Coordinate();
    papayaContainers[0].viewer.getWorldCoordinateAtIndex(originalCoord.x, originalCoord.y, originalCoord.z, world);

    currentPaint.matrix_coor.push(originalCoord)
    currentPaint.world_coor.push(world)
    template.painters.set(painters)
    
    
    
    draw_point(screenCoor, viewer, curveColor, 3)
    var canvas = viewer.canvas
    var context = canvas.getContext('2d');

    context.lineTo(screenCoor.x, screenCoor.y);
    context.moveTo(screenCoor.x, screenCoor.y);
    context.stroke();
    context.closePath();                 
    
}

var end_paint = function(template, originalCoord, screenCoor){
    var painters = template.painters.get()
    var N = painters.length
    var currentPaint = painters[N-1]
    var world = new papaya.core.Coordinate();
    papayaContainers[0].viewer.getWorldCoordinateAtIndex(originalCoord.x, originalCoord.y, originalCoord.z, world);
    var currVal = Session.get("paintValue")
    
    currentPaint.matrix_coor.push(originalCoord)
    currentPaint.world_coor.push(world)
    currentPaint.paintValue = currVal
    template.painters.set(painters)
    
    
    var viewer = papayaContainers[0].viewer
    draw_point(screenCoor, viewer, curveColor, 3)
    var canvas = viewer.canvas
    var context = canvas.getContext('2d');

    context.lineTo(screenCoor.x, screenCoor.y);
    context.moveTo(screenCoor.x, screenCoor.y);
    context.stroke();      
    context.closePath();
    
    //currentPaint.original_vals = []
    currentPaint.matrix_coor.forEach(function(val, idx, arr){
        var old_val = setValue(papayaRoundFast(val.x), papayaRoundFast(val.y), papayaRoundFast(val.z), currVal)
        //currentPaint.original_vals.push(old_val)
    })
    Session.set("isDrawing", false)
    viewer.drawViewer(true,false)
    //console.log(currentPaint)
               

}

restore_vals = function(currPaint){
    
    currPaint.matrix_coor.forEach(function(val, idx, arr){
        setValue(papayaRoundFast(val.x), papayaRoundFast(val.y), papayaRoundFast(val.z), currPaint.original_vals[idx])        
    })
    var viewer = papayaContainers[0].viewer
    viewer.drawViewer(true,false)
    
}

logpoint = function(e, template, type){

    var viewer = papayaContainers[0].viewer

    if((e.shiftKey || template.touchscreen.get()) && e.altKey == false ){

        var currentCoor = papayaContainers[0].viewer.cursorPosition
        var originalCoord = new papaya.core.Coordinate(currentCoor.x, currentCoor.y, currentCoor.z)
        var screenCoor = new papaya.core.Point(e.offsetX, e.offsetY) //papayaContainers[0].viewer.convertCoordinateToScreen(originalCoord);
        
        var mode = template.logMode.get()

        if ( mode == "point" && type=="click"){
            annotate_point(template, originalCoord, screenCoor)
        }
        
        else if (mode == "contour"){
            if (type=="mousedown"){
                start_curve(template, originalCoord, screenCoor)
            }
    
            else if (type=="mousemove"){
                continue_curve(template, originalCoord, screenCoor)
            }
            
            else if (type=="mouseup" || type=="mouseout"){
                end_curve(template, originalCoord, screenCoor)
            }

        }
        
        else if (mode == "paint"){
            if (type=="mousedown"){
                start_paint(template, originalCoord, screenCoor)
            }
    
            else if (type=="mousemove" && Session.get("isDrawing")){
                continue_paint(template, originalCoord, screenCoor)
            }
            
            else if (type=="mouseup" || type=="mouseout"){
                end_paint(template, originalCoord, screenCoor)
                
            }

        }
        


    }
    else{Session.set("isDrawing", false)}

    return true

}