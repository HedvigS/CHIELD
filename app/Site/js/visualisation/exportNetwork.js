
function saveCanvasAsPNG(){
	
	var canvas = document.getElementsByTagName("canvas")[0];

	var link = document.createElement('a');
	link.style.display = 'none';
	link.href = canvas.toDataURL();
	link.download = "CausalLinks.png"
	document.body.appendChild(link);
  	link.click();
 	document.body.removeChild(link);
}

function saveDataAsCSV(){
	var table = $("#links_table").DataTable();
	var csvData = datatableToCSV(table);
	var encodedUri = "data:text/csv;charset=utf-8,"+encodeURIComponent(csvData);

	var link = document.createElement('a');
	link.style.display = 'none';
	link.href = encodedUri;
	link.download = "CausalLinks.csv"
	document.body.appendChild(link);
  	link.click();
 	document.body.removeChild(link);
}

function saveDataAsDOT(includePos = false,directed = true){
	var dotData = visGraphToDot(network,network_nodes,network_edges,includePos,directed);
	var encodedUri = "data:text/csv;charset=utf-8,"+encodeURIComponent(dotData);

	var link = document.createElement('a');
	link.style.display = 'none';
	link.href = encodedUri;
	link.download = "CausalLinks.dot"
	document.body.appendChild(link);
  	link.click();
 	document.body.removeChild(link);
}
