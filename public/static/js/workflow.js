window.onload = function () {
  // console.log = function() {};
  $("#btnLoad").hide();
  window.newUrls = [[]];

  // Button to logout
  $("#logoutBtn").on("click", function () {
    document.cookie =
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJwYWNvIiwiZXhwIjoxNjAwNzU5MTU4fQ.zxRdevs1bGgMFuijF2AkYrsiMBXpLWrWqYrmH7dDvJE";
    window.location.replace("./index.html");
  });

  // Check session and add username
  $.ajax({
    url: `/api/v2/auth/user/me`,
    type: "GET",
    headers: {
      Authorization: "Bearer " + document.cookie,
    },
    dataType: "application/x-www-form-urlencoded",
    async: true, // false,
    statusCode: {
      404: function () {
        console.log("404 not found");
      },
      401: function () {
        console.log("Your session has expired! redirecting to main page");
      },
      200: function () {
        console.log("200 session ok");
      },
    },
    complete: function (response) {
      if (response.statusText === "OK") {
        jsonResponse = JSON.parse(response.responseText);
        $("#username").text(jsonResponse.username);
      } else if (response.statusText === "Unauthorized") {
        alert("User not identified! You must log in. Redirecting to main page");
        window.location.replace("./index.html");
      }
    },
  });
};

// When clicking new-flowchart
$(document).on("click", "#new-flowchart", function () {
  $("#new-flowchart").hide();
  $("#execute").removeAttr("disabled");
  $("#export").removeAttr("disabled");
  $("#delete").removeAttr("disabled");
  $("#createRdf").removeAttr("disabled");
  $("#save").removeAttr("disabled");
  $("#fileinput").removeAttr("disabled");
  $("#importWorkflowBtn").removeAttr("disabled");
  $("#loadOntologies").removeAttr("disabled");
  $("#checkInvalidComponents").removeAttr("disabled");

  var $flowchart = $(".flowchart-container");
  $flowchart.css("background-color", "#fff");
  var $container = $flowchart.parent();
  var data = {
    operators: {},
    links: {},
  };

  var parameters;
  var uriAndIndividual = [];
  var compatibleComponents = [];
  var topicNumber = 0;
  var selectedOperatorId = null;
  var countAccess = 0;
  let hoveredParamsEachOp = [];
  let currentWorkflowId;
  let currentWorkflowUri;
  let selectedOpIndiv;

  $.ajax({
    url: `/api/v2/workflow/new`,
    type: "POST",
    accept: "application/json",
    headers: {
      Authorization: "Bearer " + document.cookie,
    },
    async: true, // false,
    statusCode: {
      404: function () {
        console.log("404 not found!");
      },
      401: function () {
        console.log("401 Invalid credentials!");
      },
      200: function () {
        console.log("200 new workflow");
      },
    },
    complete: function (response) {
      if (response.statusText === "OK") {
        currentWorkflowId = response.responseJSON;
      } else if (response.statusText === "Unauthorized") {
        alert("Your session has expired! redirecting to main page");
        window.location.replace("./index.html");
      }
    },
  });

  // Initializing general parameters
  $flowchart.flowchart({
    data: data,
    linkWidth: 5,
    multipleLinksOnOutput: true,
    defaultLinkColor: "#f65959",
    defaultSelectedLinkColor: "black",
    distanceFromArrow: 0,

    // When selecting an operator
    onOperatorSelect: function (operatorId) {
      let ontoMap = $("#ontoMapping");
      // Save topics changes in case of selecting other operators
      if (
        selectedOperatorId !== null &&
        $("#" + selectedOperatorId)[0] !== undefined &&
        $("#" + selectedOperatorId)[0].lastChild.lastChild !== undefined
      ) {
        var selectedLabels = $("#" + selectedOperatorId)[0].lastChild.lastChild;
        let oldData = $flowchart.flowchart("getOperatorData", selectedOperatorId);
        for (let i = 0; i < selectedLabels.childNodes.length - 1; i++) {
          $("#" + selectedOperatorId)[0].lastChild.lastChild.children[i].children[0].children[0].setAttribute(
            "contenteditable",
            "false"
          );
          oldData.properties.outputs["output_" + i].label =
            selectedLabels.children[i].children[0].children[0].textContent;
        }
      }

      selectedOperatorId = operatorId;
      let data = $flowchart.flowchart("getOperatorData", operatorId);

      // show operator data on fieldset
      $("#operator-id").attr("placeholder", operatorId);
      $("#operator-name").attr("placeholder", data.properties.name);
      $("#setData").show();
      $("#setData").removeAttr("disabled");
      $("#updateDiv").removeAttr("disabled");

      $("#paramsField").attr("disabled", "false");
      let paramsDiv = $("#params");
      paramsDiv.empty();

      // By default, we assume the operator contains no File
      let operatorContainsFile = false;

      // Create operator instance to save parameter changes info
      if (!hoveredParamsEachOp.includes(operatorId)) {
        hoveredParamsEachOp.push([]);
      }

      // If the clicked component is "Read CSV" prepare the display info - if it is of data collection
      let thisDataCollectionOps = document.dataCollectionOps;
      let thisIndiv = data.properties.name.substring(0, data.properties.name.length - 1);
      if (isNaN(thisIndiv.slice(-1)) === false) {
        thisIndiv = thisIndiv.substring(0, thisIndiv.length - 1);
      }
      selectedOpIndiv = thisIndiv;

      // If it is a data collection operator it should contain a file
      if (thisDataCollectionOps.includes(thisIndiv)) {
        operatorContainsFile = true;
      }

      let importCsvBtn = $("#importCsvBtn");

      // Fetching parameters from selected component

      uriAndIndividual2 = data.definition.uri.split("/");
      let individual = uriAndIndividual2[uriAndIndividual2.length - 1];
      uriAndIndividual2.pop();
      let uri = uriAndIndividual2.join("/");

      //uriAndIndividual = data.definition.uri.split("#");
      let componentsAll = document.componentAll;

      let selectedOpType;
      findOpTypeLoop: for (let opType in componentsAll) {
        for (let operator in componentsAll[opType].operators) {
          if (componentsAll[opType].operators[operator].properties.name === thisIndiv) {
            selectedOpType = opType.toString();
            break findOpTypeLoop;
          }
        }
      }

      let thisCompParams;
      for (let operator in componentsAll[selectedOpType].operators) {
        if (componentsAll[selectedOpType].operators[operator].properties.name === thisIndiv) {
          thisCompParams = componentsAll[selectedOpType].operators[operator].properties.parameters;
          break;
        }
      }

      let params = thisCompParams;
      paramsDiv = $("#params");
      paramsDiv.empty();

      if (params.length === 0) {
        let uniParamNameDiv = $("<summary/>", { text: "No params" });
        uniParamNameDiv.appendTo(paramsDiv);
        $("#updateDiv").hide();
      } else {
        $("#updateDiv").show();
        let addedWarning = false;
        for (let param in params) {
          let paramLabel = params[param].properties.label;
          let paramName = params[param].properties.name;

          let paramDiv = $("<div/>");
          paramDiv.attr("id", paramName);
          let paramNameDiv = $("<summary />", {
            text: paramLabel + " :",
          });
          let typeChunks = data.parameters[param].definition.type.split("/");
          let paramType = typeChunks[typeChunks.length - 1].toLowerCase();
          let paramInputDiv = $("<input />", {
            id: "id-" + paramName,
            class: "input",
            type: "text",
            placeholder: data.parameters[param].properties.value,
            name: "id-" + paramName,
          });
          paramInputDiv.val(data.parameters[param].properties.value);

          if (paramType === "file") {
            operatorContainsFile = true;
          }
          paramInputDiv.addClass("param-input");

          // y en vez de hovered, updated
          if (!hoveredParamsEachOp[operatorId].includes(params[param].properties.label)) {
            paramInputDiv.addClass("warning");
            paramInputDiv.attr("title", "default value");
            addedWarning = true;
          }

          // Manejar el aviso en el componente; debe hacerse cuando se hace update, no aquí
          if (addedWarning === false) {
            $("#" + operatorId)[0].classList.remove("warning");
            $("#" + operatorId)[0].setAttribute("title", "");
            let opTitle = $("#" + operatorId)[0].firstChild.firstChild;
            if (opTitle.firstChild.nodeName.toLowerCase() === "span") {
              opTitle.firstChild.remove();
            }
          }
          paramNameDiv.appendTo(paramDiv);
          paramInputDiv.appendTo(paramDiv);
          paramDiv.appendTo(paramsDiv);

          // Content validation
          function validate(e) {
            let typeOfInput = "string";
            let val = e.target.value;

            if (e.target.value.split(",")[1] !== undefined && e.target.value.split(",")[1] !== "") {
              typeOfInput = "list";
            }

            if (isNaN(val) === false) {
              let isInt = val % 1 === 0; // módulo 1
              if (isInt === true) {
                typeOfInput = "integer";
              } else if (isInt === false) {
                typeOfInput = "float";
              }
            } else if (val.toLowerCase() === "true" || val.toLowerCase() === "false") {
              typeOfInput = "boolean";
            } else if (val.toLowerCase() === "true" || val.toLowerCase() === "false") {
              typeOfInput = "boolean";
            } else if (paramType === "file") {
              typeOfInput = "file";
            }

            if (paramType === "list" && typeOfInput === "string") {
              typeOfInput = "list";
            }

            if (typeOfInput === paramType || (typeOfInput === "float" && paramType === "double")) {
              e.target.classList.add("valid");
              e.target.classList.remove("invalid");
              $("#setData").removeAttr("disabled");
            } else {
              e.target.classList.add("invalid");
              e.target.classList.remove("valid");
              $("#setData").attr("disabled", "disabled");
            }
          }
          document.getElementById("id-" + paramName).addEventListener("input", validate);

          // Remove warning from parameters when updating its value
          let paramLab = params[param].properties.label;
          let currentOp = hoveredParamsEachOp[operatorId];
          $("#id-" + paramName).on("change", function () {
            $(this).removeClass("warning");
            $(this)[0].title = "";
            if (!currentOp.includes(paramLab)) {
              currentOp.push(paramLab);
            }
            // Update component warning
            let paramsLength = null;
            if (thisIndiv === "ComponentImportTabularDataset") {
              // quito el num
              paramsLength = params.length - 2;
            } else {
              paramsLength = params.length;
            }
            if (hoveredParamsEachOp[operatorId].length === paramsLength) {
              document.remWarning = true;
            } else {
              document.remWarning = false;
            }
          });
        }
      }

      // Manage visibility of import Csv
      if (operatorContainsFile) {
        if (selectedOpIndiv === "ComponentImportTabularDataset") {
          $("#submitFileButton").attr("disabled", false);
          ontoMap.show();
          $("#viewCsv").show();
          $("#urlForm").show();
        }
      } else {
        document.getElementById("importCsvBtn").style.display = "none";
        importCsvBtn.hide();
        importCsvBtn.attr("disabled", true);
        ontoMap.hide();
        $("#viewCsv").hide();
        $("#urlForm").hide();
      }
      if (thisIndiv === "ComponentImportTabularDataset") {
        $("#id-numberOfColumns").removeClass("warning");
        $("#id-numberOfColumns").prop("disabled", true);
      }

      // Clear recommendations
      for (let component in compatibleComponents) {
        $("#" + compatibleComponents[component]).attr("style", "background-color:white");
      }

      // Fetching compatible components with the one selected
      fetch(
        `/api/v2/semantic/component/compatible?component_id=` + individual + "&uri=" + uri
      )
        .then(function (response2) {
          //fetch(`/api/v2/semantic/component/compatible?component_id=` + uriAndIndividual[1] + '&uri=' + uriAndIndividual[0]).then(function (response2) {
          return response2.json();
        })
        .then(function (myJson2) {
          for (var operator in myJson2.compatible_components) {
            let current = myJson2.compatible_components[operator].properties.name;
            compatibleComponents.push(current);
            $("#" + current).attr("style", "background-color:Khaki");
          }
        });

      // join tables
      function joinTables(tables) {
        let joinedMapping = {};
        let joinedHeaderNames = [];
        let joinedHeaderTypes = [];

        // Recorrer tablas de archivos entrantes
        for (let table in tables) {
          let thisData = tables[table];
          let thisTableHeadNames = thisData.parameters[0].properties.value.split(",");
          let thisTableHeadTypes = thisData.parameters[4].properties.value.split(",");
          let thisMapping = thisData.ontology_mapping;
          if (table === "0") {
            joinedMapping = thisMapping;
          }
          let repeatedHeaderPositions = [];

          // Add new header names
          for (let name in thisTableHeadNames) {
            if (!joinedHeaderNames.includes(thisTableHeadNames[name])) {
              joinedHeaderNames.push(thisTableHeadNames[name]);
            } else {
              // Already included
              repeatedHeaderPositions.push(name);
            }
          }
          // Add new header types
          for (let type in thisTableHeadTypes) {
            if (!joinedHeaderTypes.includes(thisTableHeadTypes[type])) {
              joinedHeaderTypes.push(thisTableHeadTypes[type]);
            }
          }
          // Join mappings
          for (let mapKey in thisMapping) {
            if (mapKey === "columns_mapping") {
              for (let i in thisMapping[mapKey]) {
                // Si había varias, dejar vacío
                if (repeatedHeaderPositions.includes(i)) {
                  // Guardar aquí los valores, comparar fuera si son iguales?
                  // Recorrer tablas antes y comparar resultados
                  // Dentro de la columna común, si tienen el mismo valor, usarlo. Si no dejarlo en blanco.
                  let allMappingPropsForThisRow = [];
                  let allMappingClassForThisRow = [];
                  for (let pos in tables) {
                    let otherMappingProp = tables[pos].ontology_mapping[mapKey][i].Property;
                    allMappingPropsForThisRow.push(otherMappingProp);
                  }

                  // Si tienen el mismo valor, pasarlo al nuevo mapping
                  let sameProps = true;
                  let firstPropValue = true;
                  for (let prop in allMappingPropsForThisRow) {
                    if (firstPropValue !== allMappingPropsForThisRow[prop]) {
                      sameProps = false;
                    }
                  }

                  if ((sameProps = true)) {
                    joinedMapping.columns_mapping[i].Property = thisMapping[mapKey][i].Property;
                    joinedMapping.columns_mapping[i].Class = thisMapping[mapKey][i].Class;
                  } else if ((sameProps = false)) {
                    joinedMapping.columns_mapping[i].Property = "";
                    joinedMapping.columns_mapping[i].Class = "";
                  }
                } else {
                  // Si es única, se hereda el mapeo
                  joinedMapping.columns_mapping[i].Property = thisMapping[mapKey][i].Property;
                  joinedMapping.columns_mapping[i].Class = thisMapping[mapKey][i].Class;
                }
              }
            }
          }

          /*if(CommonColumns){ // There are common columns
                        if(sameMapping){ // Common columns have same mapping

                        }else{ // Common columns have different mapping
                        }
                    }else{ // All columns are different
                    }*/
        }
        let joinedtablesData = tables[0];
        joinedtablesData.parameters[0].properties.value = joinedHeaderNames;
        joinedtablesData.parameters[4].properties.value = joinedHeaderTypes;
        joinedtablesData.ontology_mapping = joinedMapping;

        return joinedtablesData;
      }

      // Open new window for ontology Mapping
      // Limit to one time for each operator (using .off for the time being)
      ontoMap = $("#ontoMapping");
      ontoMap.off("click").on("click", function () {
        if (document.loadedFiles[operatorId] === undefined) {
          alert("No file to map");
        } else {
          lastParsedFile = document.loadedFiles[operatorId][document.loadedFiles[operatorId].length - 1];
          let opId = operatorId;
          let dataToUse = $flowchart.flowchart("getOperatorData", opId); //null;
          // If tabular (file) clicked load from connected read
          // or headers from previous operator

          // Clicked operator
          let operator = $("#" + opId)[0];

          // Obtain connector set, input and output connector set
          let opConnectors = operator.lastChild;

          if (opConnectors !== undefined && opConnectors !== null) {
            let opData = $flowchart.flowchart("getOperatorData", opId);
            let opInputConnectorSet = opConnectors.firstChild;
            // Input connector set

            // Obtain if it has input and output connectors inside connector sets
            let opHasInputConnectors = opInputConnectorSet.childNodes.length > 1;

            // Obtain connector nodes
            let inputConnectors = {};
            let numInputConnectors = 0;
            if (opHasInputConnectors) {
              inputConnectors = opInputConnectorSet.childNodes;
              // Enter the input connector set, get the children nodes
              numInputConnectors = (inputConnectors.length - 1).toString();
            }

            // Check if there are unused connectors
            let numInputConnectors_Data = 0;
            let numDifInputConnectors_Data = 0;
            let data = $flowchart.flowchart("getData");
            let opInputLinks = [];

            for (let link in data.links) {
              if (data.links[link].toOperator.toString() === opId) {
                numInputConnectors_Data++;
                opInputLinks.push(data.links[link]);
              }
              let lastConnector = "";
              if (data.links[link].toConnector.toString() + opId !== lastConnector.toString() + opId) {
                numDifInputConnectors_Data++;
              }
              lastConnector = data.links[link].toConnector.toString() + opId;
            }

            // Check if it has no inputs
            let opHasNoInputs = numInputConnectors === 0;
            let numberOfInputs = opInputConnectorSet.childNodes.length - 1;
            let numberOfUsedInputs = numInputConnectors_Data;

            // Get mappings from input connections
            let mappingsList = [];
            let tables = [];
            for (let link in opInputLinks) {
              let thisId = opInputLinks[link].fromOperator;
              let thisData = $flowchart.flowchart("getOperatorData", thisId);
              let thisLinkMap = thisData.ontology_mapping;
              mappingsList.push(thisLinkMap);
              tables.push(thisData);
            }
            let lastOpData = null;
            if (numberOfInputs === 1) {
              if (opInputLinks[0] !== undefined) {
                let fromOpId = opInputLinks[0].fromOperator;
                lastOpData = $flowchart.flowchart("getOperatorData", fromOpId);
              }
            }
            // Check connected output types
            let connectedOutType = null;
            let currentOutType = null;
            let sameOutputType = connectedOutType === currentOutType;

            // if it is a read component/ Data collection /No inputs component  use it's data
            if (opHasNoInputs) {
              // && data.properties.name === 'ComponentReadTabularDataset'
              dataToUse = opData;
            } else {
              // Not a data Collection operator.
              // If connected, same input type and enabled mapping, load previous component mapping.
              if (numberOfUsedInputs > 0) {
                // Connected
                if (sameOutputType) {
                  // Same output type (tabular dataset)
                  if (numberOfInputs === 1) {
                    // Load data from unique connected input operator to reutilize mapping
                    dataToUse = lastOpData;
                  } else {
                    // More than one input. Possibly from different components
                    // Combine inputs to load new mapping (join them, not repeating same ones)
                    let joinedData = joinTables(tables);
                    dataToUse = joinedData;
                  }
                } else {
                  // Different output types. Empty annotation
                  dataToUse = opData;
                }
              } else {
                // Not existing input, load empty data
                dataToUse = opData;
              }
            }
          }
          let headerNames;
          let headerTypes;
          let mappingJson;
          let delimiter = dataToUse.parameters[0].properties.value;

          headerNames = dataToUse.parameters[2].properties.value.split(delimiter);
          headerTypes = dataToUse.parameters[3].properties.value.split(delimiter);
          mappingJson = dataToUse.ontology_mapping;
          let resource = dataToUse.parameters[5].properties.value;

          let newWindow3 = window.open("ontologyMapping.html", "ontoMap", "width=900, height=400");
          newWindow3.resource = resource;
          newWindow3.headerNames = headerNames;
          newWindow3.headerTypes = headerTypes;
          newWindow3.mappingJson = dataToUse.ontology_mapping;
          newWindow3.ontoTitleString = "Editing and Ontological Mapping of Columns";
        }
      });
    },

    // When unselecting operator
    onOperatorUnselect: function () {
      $("#ontoMapping").hide();
      $("#viewCsv").hide();
      $("#urlForm").hide();

      $("#submitFileButton").attr("disabled", true);
      document.getElementById("importCsvBtn").style.display = "none";
      $("#importCsvBtn").hide();
      $("#importCsvBtn").attr("disabled", true);

      $("#loadCsv").hide();
      $("#loadCsv").attr("disabled", true);
      $("input")
        .filter(function () {
          return this.id.match(/operator*/);
        })
        .attr("placeholder", "");
      if (selectedOperatorId !== null && $("#" + selectedOperatorId)[0] !== undefined) {
        let selectedLabels = $("#" + selectedOperatorId)[0].lastChild.lastChild;
        let oldData = $flowchart.flowchart("getOperatorData", selectedOperatorId);

        for (let i = 0; i < selectedLabels.childNodes.length - 1; i++) {
          selectedLabels.children[i].children[0].children[0].setAttribute("contenteditable", "false");
          oldData.properties.outputs["output_" + i].label =
            selectedLabels.children[i].children[0].children[0].textContent;
        }
      }

      let paramsDiv = $("#params");
      paramsDiv.empty();
      $("#setData").hide();
      $("#setData").attr("disabled", true);

      // Clear recommendations
      for (let component in compatibleComponents) {
        $("#" + compatibleComponents[component]).attr("style", "background-color:white");
      }
      return true;
    },

    // When creating an operator
    onAfterChange: function (operator_create) {
      let lastCreatedOpId = document.createdOpId;
      let $flowchart = $(".flowchart-container");
      // Visualize each operator on double click
      $("#" + lastCreatedOpId).on("dblclick", async function () {});
    },
  });
  // End of flowchart initialization methods

  // Sólo una vez
  $("#viewCsv").on("click", async function () {
    if (document.loadedFiles[selectedOperatorId] === undefined) {
      alert("Load a File to view");
    } else {
      lastParsedFile = document.loadedFiles[selectedOperatorId][document.loadedFiles[selectedOperatorId].length - 1];
      let data = $flowchart.flowchart("getOperatorData", selectedOperatorId);

      if (selectedOpIndiv === "ComponentImportTabularDataset") {
        // filtrar por la uri que es única, o data collection
        let $flowchart = $(".flowchart-container");
        let opId = $flowchart.flowchart("getSelectedOperatorId");
        let data = $flowchart.flowchart("getOperatorData", opId);
        let headerNames = data.parameters[2].properties.value.split(",");
        let newWindow = window.open("viewCsv.html", "Csv content", 'fullscreen="yes"');

        newWindow.headerNames = headerNames;
        newWindow.numColumns = lastParsedFile[0].length;
        newWindow.headerTypes = data.parameters[4].properties.value;
        newWindow.tableFromCSV = lastParsedFile;
        newWindow.titleString = "Csv File Preview";
        newWindow.hasHeader = $("#id-has_header").val().toLowerCase();
        newWindow.numColumnsStats = lastParsedFile[0].length;
        newWindow.numLinesStats = lastParsedFile.length;
        newWindow.minioPath = data.parameters[5].properties.value;
        newWindow.statsTitleString = "Stats of selected file: ";
      } else if (data.properties.name === "ComponentSplitShuffleCSV") {
        let flowchartData = $flowchart.flowchart("getData");
        $.ajax({
          url: `/v2/run`,
          type: "POST",
          data: JSON.stringify(flowchartData),
          dataType: "json",
          async: true,
          success: async function (d) {
            let id = d.ticket_id;
            setTimeout(() => {
              async function wait() {
                let res2 = await fetch(`/v2/status?ticket_id=${id}`);
                let ticket = await res2.json();
                let parts = ticket.process_chain_list[opId].task_data;
                let regex = /Topic-[0-9]+/g; // g allows for multiple match
                let topicNames = parts.match(regex);
                let inputChannels = 0;
                let outputChannels = 0;
                let channels = flowchartData.links;

                for (let j = 0; j < Object.keys(channels).length; j++) {
                  if (parseInt(channels[j].fromOperator) === parseInt(opId)) {
                    outputChannels++;
                  } else if (parseInt(channels[j].toOperator) === parseInt(opId)) {
                    inputChannels++;
                  }
                }

                let outputTopicNames = topicNames.slice(inputChannels, topicNames.length);
                let tables = [];
                let channelsData = [];

                for (let channel in outputTopicNames) {
                  let url = `/v2/topic_params?topic_name=${outputTopicNames[channel]}`;
                  fetch(url)
                    .then((res) => res.json())
                    .then((data) => {
                      channelsData.push(data);
                      let tableFromDownloadedCsv = [];
                      Papa.parse(data.resource, {
                        download: true,
                        delimiter: "",
                        header: false,
                        step: function (results) {
                          let line = results.data;
                          let arr = Array.from(Object.keys(line), (k) => [line[k]]);
                          tableFromDownloadedCsv.push(arr);
                        },
                      });
                      tables.push(tableFromDownloadedCsv);
                    })
                    .catch((err) => {
                      throw err;
                    });
                }
                setTimeout(() => {
                  // Open new window for  ReadCsv view
                  let newWindow4 = window.open("visualizeTables.html", "Csv content", 'fullscreen="yes"');
                  newWindow4.headerNames = channelsData[0].header_names;
                  newWindow4.numColumns = channelsData[0].number_of_columns;
                  newWindow4.tables = tables;
                  newWindow4.titleString = "Split Preview";
                }, 6000);
              }
              wait();
            }, 10000);
          },
        });
      }
    }
  });

  // When the user clicks the button, open the modal
  $("#filesModalButton").on("click", function () {
    var modal = document.getElementById("myModal");
    modal.style.display = "block";
  });

  // Get user info at intervals to check
  function checkSession() {
    let validSession;
    $.ajax({
      url: `/api/v2/auth/user/me`,
      type: "GET",
      headers: {
        Authorization: "Bearer " + document.cookie,
      },
      dataType: "json",
      async: false,
      statusCode: {
        404: function () {
          console.log("404 not found");
        },
        401: function () {
          console.log("401 Invalid credentials");
        },
        200: function () {
          console.log("200 session ok");
        },
      },
      complete: function (response) {
        if (response.statusText === "OK") {
          validSession = true;
        } else if (response.statusText === "Unauthorized") {
          validSession = false;
        }
      },
    });
    return validSession;
  }

  // Refreshing data intervals definition
  let validSession = true;
  let interval = setInterval(async function () {
    if (validSession === true) {
      let result = await checkSession();
      validSession = result;
    } else {
      clearInterval(interval);

      alert("Your session has expired! redirecting to main page");
      let confirmResult = confirm("Do you want to save your workflow before being redirected?");
      if (confirmResult === true) {
        $("#save").trigger("click");
      }
      window.location.replace("./index.html");
    }
  }, 60000);
  // Cada minuto
  // Fin de check session

  var modal = document.getElementById("myModal");
  var span = document.getElementsByClassName("myModalClose")[0];
  span.onclick = function (event) {
    modal.style.display = "none";
  };
  // When the user clicks anywhere outside of the modal, close it
  window.onclick = function (event) {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  };

  // Validate componentConnections
  $(".is-link").on("change", function () {
    let impOnto = $("#importOnto");
    if (impOnto.prop("hidden") === true) {
      impOnto.toggle();
      impOnto.prop("disabled", false);
    } else {
      impOnto.toggle();
      impOnto.prop("disabled", true);
    }
  });

  // Load ontologies
  $("#loadOntologies").on("click", function () {
    let impOnto = $("#importOnto");
    if (impOnto.prop("hidden") === true) {
      impOnto.toggle();
      impOnto.prop("disabled", false);
    } else {
      impOnto.toggle();
      impOnto.prop("disabled", true);
    }
  });

  // Execute workflow
  $("#execute").on("click", function () {
    let data = $flowchart.flowchart("getData");

    // Añadir label a inputs
    for (let op in data.operators) {
      // Si tiene inputs (conectadas)

      if (data.operators[op].properties.inputs !== undefined) {
        for (let input in data.operators[op].properties.inputs) {
          // Conseguir el conectado a esa input, su output, el topic

          for (let link in data.links) {
            if (data.links[link].toOperator == op && data.links[link].toConnector == input) {
              // Es igual que el num de input en el que estoy?
              let originOperator = data.links[link].fromOperator;
              let originConnector = data.links[link].fromConnector;

              name = data.operators[originOperator].properties.outputs[originConnector].properties.label;
              data.operators[op].properties.inputs[input].properties.label = name;
            }
          }
        }
      }
    }
    // Fin añadir inputs
    for (let op in data.operators) {
      for (let par in data.operators[op].parameters) {
        let delimiter = "";
        if (data.operators[op].parameters[par].properties.label == "delimiter") {
          delimiter = data.operators[op].parameters[par].properties.value;
        }
        let typeChunks = data.operators[op].parameters[par].definition.type.split("/");
        let paramType = typeChunks[typeChunks.length - 1];
        if (paramType == "List") {
          data.operators[op].parameters[par].properties.value = data.operators[op].parameters[
            par
          ].properties.value.split(",");
        }
      }
    }

    let sherlockData = data;
    for (let op in data.operators) {
      let newParams = {};
      for (let param in data.operators[op].parameters) {
        newParams["param_" + param] = data.operators[op].parameters[param];
      }
      sherlockData.operators[op].parameters = newParams;
    }

    for (let op in data.operators) {
      // Dejando en todos módulo de python de momento
      sherlockData.operators[op].properties.module = sherlockData.operators[op].properties.module[0].module;
    }

    // Getting imported workflow id
    let workflow_id = currentWorkflowId;

    $.ajax({
      url: `/api/v2/workflow/update?workflow_id=${workflow_id}`,
      type: "POST",
      data: JSON.stringify(sherlockData),
      headers: {
        Authorization: "Bearer " + document.cookie,
      },
      complete: function (response) {
        if (response.statusText === "OK") {
          $.ajax({
            url: `/api/v2/workflow/run?workflow_id=${workflow_id}`,
            type: "POST",
            headers: {
              Authorization: "Bearer " + document.cookie,
            },
            dataType: "json",
            async: false,
            complete: function (d) {
              $.ajax({
                url: `/api/v2/workflow/status?workflow_id=${workflow_id}`,
                type: "GET",
                headers: {
                  Authorization: "Bearer " + document.cookie,
                },
                async: false,
                complete: function (response) {},
              });
            },
            success: function (d) {
              var url = `./status.html` + "?" + "ticket_id" + "=" + workflow_id;
              window.open(url, "_blank");
            },
            error: function (xhr, textStatus, error) {},
          });
        } else if (response.statusText === "Unauthorized") {
          alert("Your session has expired! redirecting to main page");
          window.location.replace("./index.html");
        }
      },
    });
  });

  // Validate workflow, sending it to the api to create the RDF
  $("#createRdf").on("click", function () {
    let data = $flowchart.flowchart("getData");
    $.ajax({
      url: `/v2/parse_rdf`,
      type: "POST",
      data: JSON.stringify(data),
      dataType: "json",
      async: false,
      success: function (d) {
        window.open(d.uri);
      },
    });
  });

  // Import workflow visibility
  $("#importWorkflowBtn").on("click", function () {
    let impWorkflow = $("#importWorkflow");
    if (impWorkflow.prop("hidden") === true) {
      impWorkflow.toggle();
      impWorkflow.prop("disabled", false);
    } else {
      impWorkflow.toggle();
      impWorkflow.prop("disabled", true);
    }
  });

  // Load workflow
  $("#loadWorkflow").on("click", function () {
    var fileSelect = document.getElementById("workflowSelect");
    if (fileSelect.files && fileSelect.files.length === 1) {
      let fr = new FileReader();
      fr.onload = receivedText;
      fr.readAsText(fileSelect.files[0]);
    } else {
      alert("Please select a file before clicking 'Load'");
    }
    function receivedText(e) {
      let lines = e.target.result;
      let newArr = JSON.parse(lines);
      $flowchart.flowchart("setData", newArr, undefined, true);
    }
  });

  // Click Import file
  $("#startNew").on("click", function () {
    var result = confirm("Are you sure to delete all?");
    if (result) {
      $flowchart.flowchart("cleanLayers");
    }
  });

  // Click Import file
  $("#fileinput").on("click", function () {
    $("#btnLoad").attr("disabled", "false");
    document.getElementById("fileinput").onchange = function () {
      let importedFileName = "Selected file: " + this.files[0].name;
      $("#importedFileTitle").attr("span", "bbb");
    };
  });

  // Delete selected component
  $("#delete").on("click", function () {
    $flowchart.flowchart("deleteSelected");
  });

  // Show current workflow data
  $("#export").on("click", function () {
    let data = $flowchart.flowchart("getData");
    data = JSON.stringify(data, null, 2);
    $(".modal").addClass("is-active");
    $(".content").text(data);
  });

  // Show current workflow data
  $(".region").on("click", function () {
    $(".modal").addClass("is-active");
    $(".content").text("asdafdsfgds");
  });

  // Save current workflow data
  $("#save").on("click", function () {
    let data = $flowchart.flowchart("getData");
    let dataJson = JSON.stringify(data, null, 2);
    let a = document.createElement("a");
    a.setAttribute("href", "data:text/plain;charset=utf-u," + encodeURIComponent(dataJson));
    a.setAttribute("download", "Workflow.json");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    $.jGrowl.defaults.position = "top-left";
    $.jGrowl("Workflow saved");
  });

  // List workflows
  $("#listWorkflows").on("click", function () {
    $.ajax({
      url: `/api/v2/workflow/all`,
      type: "GET",
      headers: {
        Authorization: "Bearer " + document.cookie,
      },
      async: false,
      statusCode: {
        404: function () {
          console.log("404 not found");
        },
        401: function () {
          console.log("401 Invalid credentials");
        },
        200: function () {
          console.log("login ok");
        },
      },
      complete: function (response) {
        if (response.statusText === "OK") {
        } else if (response.statusText === "Unauthorized") {
          alert("Invalid credentials! Please try again");
        }
      },
    });
  });

  $("#findWorkflow").on("click", function () {
    let workflow_id = "e832edd551304c4ab72116d7867c869b";
    $.ajax({
      url: `/v2/workflow/find?workflow_id=${workflow_id}`,
      type: "GET",
      headers: {
        Authorization: "Bearer " + document.cookie,
      },
      async: false,
      statusCode: {
        404: function () {
          console.log("404 not found");
        },
        401: function () {
          console.log("401 Invalid credentials");
        },
        200: function () {
          console.log("login ok");
        },
      },
      complete: function (response) {
        if (response.statusText === "OK") {
          console.log("200 login ok");
        } else if (response.statusText === "Unauthorized") {
          alert("Invalid credentials! Please try again");
        }
      },
    });
  });

  // Check connections
  $("#checkConnections").on("click", function () {
    let workflow_id = currentWorkflowId;
    let workflow_uri =
      "http://www.khaos.uma.es/khaosteam/sensacion/titan-workflow#Workflow4e4680f3e8204f85893385f11001632e";
    $.ajax({
      url: `/api/v2/semantic/workflow/check/connections?workflow_id=${workflow_id}&uri=${workflow_uri}`,
      type: "GET",
      headers: {
        Authorization: "Bearer " + document.cookie,
      },
      async: false,
      statusCode: {
        404: function () {
          console.log("404 not found");
        },
        401: function () {
          console.log("401 Invalid credentials");
        },
        200: function () {
          console.log("200");
        },
      },
      complete: function (response) {
        if (response.statusText === "OK") {
          console.log("200 check connections ok");
        } else if (response.statusText === "Unauthorized") {
          alert("Invalid credentials! Please try again");
        }
      },
    });
  });

  // Close data modal
  $("#closeModal").on("click", function () {
    let modal = $(".modal");
    if (modal.hasClass("is-active")) {
      modal.removeClass("is-active");
    }
  });

  // Setting the data of a single component
  $("#setData").on("click", function () {
    let updateOperatorId = $flowchart.flowchart("getSelectedOperatorId");
    let op = document.getElementById(updateOperatorId);
    document.opCurrentTitle = $("#" + updateOperatorId)[0].firstChild.firstChild.title;
    let oldData = $flowchart.flowchart("getOperatorData", updateOperatorId);

    let paramNames = [];
    for (let param in oldData.parameters) {
      paramNames.push(oldData.parameters[param].properties.name);
    }
    let newParamValues = [];
    for (let paramName in paramNames) {
      newParamValues.push($("#id-" + paramNames[paramName]).val());
    }

    for (let i = 0; i < oldData.parameters.length; i++) {
      oldData.parameters[i].properties.value = newParamValues[i];
    }

    $flowchart.flowchart("setOperatorData", updateOperatorId, oldData);
    $.jGrowl.defaults.position = "bottom-right";
    $.jGrowl("Parameters updated");

    return false; // prevents page reload
  });

  let $draggableOperators = $(".draggable-operator");

  // Get data from Operator
  function getOperatorData($element) {
    let nbName = $element.attr("nb-data-name");
    let label = $element.attr("label");
    let nbUri = $element.attr("nb-data-uri");
    let nbDescription = $element.attr("nb-data-description");
    let nbModule = $element.attr("nb-data-module");
    let nbInputs = parseInt($element.attr("nb-inputs"));
    let nbOutputs = parseInt($element.attr("nb-outputs"));

    let ic;
    let outC;

    // Fetching parameters when creating a new component
    uriAndIndividual2 = nbUri.split("/");
    let individual = uriAndIndividual2[uriAndIndividual2.length - 1];
    uriAndIndividual2.pop();
    let uri = uriAndIndividual2.join("/");

    fetch(`/api/v2/semantic/component/parameters?component_id=` + individual + "&uri=" + uri)
      .then(function (response) {
        //fetch(`/api/v2/semantic/component/parameters?component_id=` + uriAndIndividual[1] + '&uri=' + uriAndIndividual[0]).then(function (response) {
        return response.json();
      })
      .then(function (myJson) {
        parameters = myJson;
      });

    let insOuts = document.globalIndividualsInputsOutputs;
    for (let indiv in insOuts) {
      if (indiv > 0 && insOuts[indiv][0] == individual) {
        //individual uriAndIndividual[1]
        ic = insOuts[indiv][1];
        outC = insOuts[indiv][2];
      }
    }
    let opModules = document.modules;
    let opModule;

    for (let pos in opModules) {
      if (opModules[pos][0] === nbName) {
        opModule = opModules[pos][1];
      }
    }

    for (let pos in document.numOfOps) {
      if (nbName == document.numOfOps[pos][0]) {
        nbName = nbName + document.numOfOps[pos][1];
        document.numOfOps[pos][1]++;
      }
    }

    // Data contained in every component created
    let data = {
      properties: {
        name: nbName,
        label: label,
        module: opModule,
        inputs: {},
        outputs: {},
        description: nbDescription,
        numberofinputs: nbInputs,
        numberofoutputs: nbOutputs,
      },
      definition: {
        uri: nbUri,
      },
      parameters,
      ontology_mapping: {},
    };

    for (let i = 0; i < nbInputs; i++) {
      data.properties.inputs[i] = {
        properties: {
          name: ic[i].properties.name,
          label: "Input",
        },
        definition: {
          uri: ic[i].definition.uri,
          type: ic[i].definition.type,
        },
      };
    }

    for (let i = 0; i < nbOutputs; i++) {
      data.properties.outputs["output_" + i] = {
        properties: {
          name: outC[i].properties.name,
          label: "Topic-" + (i + topicNumber),
        },
        definition: {
          uri: outC[i].definition.uri,
          type: outC[i].definition.type,
        },
      };
    }

    countAccess++;
    if (countAccess % 2 === 0) {
      topicNumber += nbOutputs;
    }
    return data;
  }

  // Make operator draggable to instantiate it into the flowchart
  $draggableOperators.draggable({
    cursor: "move",
    opacity: 0.7,
    helper: "clone",
    appendTo: "body",
    delete: "body",
    zIndex: 1000,

    helper: function (e) {
      let $this = $(this);
      let data = getOperatorData($this);
      return $flowchart.flowchart("getOperatorElement", data);
    },
    stop: function (e, ui) {
      let $this = $(this);
      let elOffset = ui.offset;
      let containerOffset = $container.offset();
      if (
        elOffset.left > containerOffset.left &&
        elOffset.top > containerOffset.top &&
        elOffset.left < containerOffset.left + $container.width() &&
        elOffset.top < containerOffset.top + $container.height()
      ) {
        let flowchartOffset = $flowchart.offset();

        let relativeLeft = elOffset.left - flowchartOffset.left;
        let relativeTop = elOffset.top - flowchartOffset.top;

        let positionRatio = $flowchart.flowchart("getPositionRatio");
        relativeLeft /= positionRatio;
        relativeTop /= positionRatio;

        let data = getOperatorData($this);
        data.left = relativeLeft;
        data.top = relativeTop;

        $flowchart.flowchart("addOperator", data);
      }
    },
  });
});
