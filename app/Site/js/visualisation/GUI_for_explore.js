var database_records = null;

var currently_selected_node = null;
var currently_selected_edge = null;
var current_selection_mode = "start";

var lastSelectedNodes = [];

var currently_clicked_location = null;

var current_relation_type = ">";

var network_last_click_time = 0;

var network_container = null;

var optionsVisible = false;

function network_on_click (params) {
	console.log("CLICK");
	console.log(params);
	// // User clicked on node - select it
	if(params["nodes"].length > 0){
	// 	user_clicked_node(params["nodes"][0]);
		console.log(lastSelectedNodes);
	   if(lastSelectedNodes.length >=2){
	   	lastSelectedNodes.shift();
	   }
	   // Find the new node
	   for(var i=0;i<params["nodes"].length;++i){
	   	 if($.inArray(params["nodes"][i], lastSelectedNodes)==-1){
			lastSelectedNodes.push(params["nodes"][i]);
	   	 }
	   }

	   if (params.nodes.length == 1) {
          if (network.isCluster(params.nodes[0]) == true) {
              network.openCluster(params.nodes[0]);
          }
       }

	} else{
	// 	// User didn't click - unselect
	 	lastSelectedNodes = [];
	}

}

function updateRecord(response, type){

	if(type=='links'){

		var obj = JSON.parse(response);
		// TODO: test if obj is correctly parsed.

		if(database_records===null){
			database_records = [];
		}

		// User may have added nodes already, but not connected them:
		var unconnectedNodes = findUnconnectedNodes();

		// In explore, this can recieve multiple updates,
		// So need to check we're not adding stuff twice
		var newRecords = false;
		var currentIds = network_edges.getIds();
		for(var i=0; i<obj.length;++i){
			if($.inArray(obj[i].pk,currentIds)==-1){
				database_records.push(obj[i]);
				newRecords = true;
			}
		}

		if(newRecords){
			//console.log(database_records);
			network_nodes.clear();
			network_edges.clear();
			
			// Update GUI
			redrawGUIfromObject(database_records);
			var currentNodeIds = network_nodes.getIds();
			for(var i=0;i<unconnectedNodes.length;++i){
				if($.inArray(unconnectedNodes[i],currentNodeIds)==-1){
					var newNode = {
						id:unconnectedNodes[i],
						label:findVariableName(unconnectedNodes[i])
					}
					network_nodes.add(newNode);
				}
			}
			network.redraw();
			changeEdgeColourScheme(edge_colour_scheme); // udpates colours and redraws legend

			// Update grid
			updateGrid(database_records);

		} else{
			alert("No new links found");
		}
	}
	if(type=="docs"){
		existingDocuments = [];
		existingDocuments_pk = [];
		var obj = JSON.parse(response);
		for(var i=0;i<obj.length;++i){
			existingDocuments.push(obj[i].citation);
			existingDocuments_pk.push(obj[i].pk);
		}
		
	}
	hideLoader();
}


function updateGrid(links){

	var links2 = ObjectToArrayOfArrays(links);
	var tmpDtable= $("#links_table").dataTable();
	tmpDtable.fnClearTable();
	tmpDtable.fnAddData(links2);

	// if(links2.length>0){
	// 	dtable.rows.add(links2);
		
	// 	// Redraw the table to show the new data
	// 	dtable.draw();
	// 	$("#links_table").show();
	// } else{
	// 	alert("No causal links found");
	// 	$("#links_table").hide();
	// }
}



function expandVariable() {

	var selectedNodes = network.getSelectedNodes();
	var keylist = selectedNodes.join(",");
	showLoader();
	requestRecord(php_link,"keylist="+keylist,'links');
}

function addVar(varname){
	$("#searchVariablesToAdd").hide();
	if(varname===null){
		varname = $("#searchVariablesToAdd").val()
	}
	var pk = findVariablePK(varname);
	if(pk!=null){
		// Check it's not already displayed
		if($.inArray(pk,network_nodes.getIds())==-1){

			var meanPos = getMeanNodePositions();
			// Add node
			var newNode = {
				id:pk,
				label:varname,
				x: meanPos.x,
				y: meanPos.y
				};
			network_nodes.add(newNode);
		}
	}
}

function addDoc(doc_citation){
	if(doc_citation===null){
		doc_citation = $("#searchDocsToAdd").val();
	}
	var doc_index = existingDocuments.indexOf(doc_citation);
	if(doc_index>=0){
		var bibref = existingDocuments_pk[doc_index];
		showLoader();
		requestRecord("php/getLinksForExploreByDocument.php","bibref="+bibref,'links');
	}
}

function bulkOut(){
	showLoader();
	var currentEdgesKeys= network_edges.getIds().join(",");
	requestRecord("php/getBulkOutLinks.php","keylist="+currentEdgesKeys,'links');
}

function getMeanNodePositions(){
	var mean_x_position = 0.0;
	var mean_y_position = 0.0;
	var nodeIds = network_nodes.getIds();
	if(nodeIds.length>0){
		var nodePositions = network.getPositions();
		for(var i=0;i<nodeIds.length;++i){
			mean_x_position += nodePositions[nodeIds[i]].x;
			mean_y_position += nodePositions[nodeIds[i]].y;
		}

		mean_x_position = mean_x_position/nodeIds.length;
		mean_y_position = mean_y_position/nodeIds.length;
	}
	console.log([mean_x_position,mean_y_position]);
	return({x:mean_x_position,y:mean_y_position});
}

function removeVariableViaNetwork(){
	var n = network.getSelectedNodes();
	for(var i=0;i<n.length;++i){
		removeVar(n);
	}
}

function removeVar(pk){

	network_nodes.remove(pk);
	// Remove from network edges
	// Find edge pks to remove
	var edgePKsToRemove = [];
	for(var i =0;i<network_edges.length;++i){
		var edge = network_edges.get()[i];
		if(edge.from==pk || edge.to==pk){
			edgePKsToRemove.push(edge.id);
		}
	}
	for(var i =0;i<edgePKsToRemove.length;++i){
		network_edges.remove(edgePKsToRemove[i]);
	}
	// remove from `database_records`
	// TODO: Test
	// for(var j=0;j<database_records.length;++j){
	// 	var database_records_edge = database_records[j];
	// 	if($.inArray(database_records_edge.pk,edgePKsToRemove) != -1){
	// 		database_records.splice(j,1);
	// 		j -= 1;
	// 	}
	// }
	
	network.redraw();
	// remove from datatable
	var varName = findVariableName(pk);
	removeVarFromDataTable(varName);

}

function removeVarFromDataTable(varname){
  var table  = $("#links_table").DataTable();
  table.rows().nodes().each(function(a,b) {
    if($(a).children().eq(0).text() == varname ||
       $(a).children().eq(2).text() == varname){
       table.rows(a).remove();
     }
  } );
  table.rows().invalidate();
  table.draw();
}

function findPaths(){
	var selectedNodes = network.getSelectedNodes();
	// selectedNodes returns the nodes that are currently selected,
	// but not the order that the user selected them in
	// so we keep track of order in lastSelectedNodes

	// If we've only selected 2 nodes
	// And there are 2 nodes in lastSelectedNodes
	// And the nodes in lastSelectedNodes are in the set of selected nodes ...
	if(selectedNodes.length==2 & 
		lastSelectedNodes.length==2 & 
		($.inArray(lastSelectedNodes[0], selectedNodes)>=0) &
		($.inArray(lastSelectedNodes[1], selectedNodes)>=0)){
		// ... then request the links between them.
		var var1 = lastSelectedNodes[0];
		var var2 = lastSelectedNodes[1];
		showLoader();
		requestRecord("php/getPaths.php","var1="+var1+"&var2="+var2,'links');
	}

}

function loadCausalLinksFromDocument(bibref){
	requestRecord("php/getLinksForExploreByDocument.php","bibref="+bibref,'links');
}



function toggleOptions(){

	optionsVisible = !optionsVisible;
	//var configWrapper = document.getElementsByClassName('vis-configuration-wrapper')[0];
	//var nsettings = document.getElementById("networkSettings");
	//nsettings.insertBefore(configWrapper,null);
	if(optionsVisible){
		$("#networkSettings").show()
		$(".vis-configuration-wrapper").show()
		hideLegend();
		$("#legendButton").hide();
	} else{
		$("#networkSettings").hide()
		$(".vis-configuration-wrapper").hide()
		$("#legendButton").show();
	}

}

function zoomInOnNode(nodeId){
	network.focus(nodeId,{animation:true,scale:2})
}

// --------------------------
// Legend and Colour Scheme
// --------------------------
function changeEdgeColourScheme(type){
	applyNetworkColorScheme(type);
	updateLegend();
}

function updateLegend(){
	// from vis_network_utils.js
	var legend = constructEdgeColourLegend(); 
	$("#legendItems").html(legend);
	// showLegend();
}

function showLegend(){
	$("#legend").show();
	$("#legendButton").hide();
}

function hideLegend(){
	$("#legend").hide();
	$("#legendButton").show();
}

// ----------
//   Loader
// ----------

function showLoader(){
	$(".loader").show();
}

function hideLoader(){
	$(".loader").hide();
}