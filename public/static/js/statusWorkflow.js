$(window).on("load", async function () {
  $("#new-flowchartStatus").on("click", async function () {
    $("#new-flowchartStatus").hide();

    var $flowchart = $(".flowchart-container");
    var data = {
      operators: {},
      links: {},
    };
    let stopExecution = false;

    $flowchart.flowchart({
      data: data,
      canUserEditLinks: false,
      canUserMoveOperators: false,
      linkWidth: 5,
      multipleLinksOnOutput: true,
      defaultLinkColor: "#f65959",
      defaultSelectedLinkColor: "black",
      distanceFromArrow: 0,
    });

    function getQuery() {
      let search = window.location.search;
      let params = new URLSearchParams(search);
      let ticket_id = params.get("ticket_id");
      return ticket_id;
    }

    let id = getQuery();
    let statusResponse;
    let getResponse;
    $.ajax({
      url: `/api/v2/workflow/status?workflow_id=${id}`,
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
          console.log("200 status ok");
        },
      },
      complete: function (response) {
        if (response.statusText === "OK") {
          statusResponse = response;
        } else if (response.statusText === "Unauthorized") {
          alert("Your session has expired! you must log in again");
        }
      },
    });

    $.ajax({
      url: `/api/v2/workflow/get?workflow_id=${id}`,
      type: "GET",
      headers: {
        Authorization: "Bearer " + document.cookie,
      },
      async: false,
      statusCode: {
        404: function () {
          console.log("404 not found!");
        },
        401: function () {
          console.log("401 Invalid credentials!");
        },
        200: function () {
          console.log("get ok!");
        },
      },
      complete: function (response) {
        if (response.statusText === "OK") {
          getResponse = response;
        } else if (response.statusText === "Unauthorized") {
          console.log("Unauthorized");
        }
      },
    });

    let listStatus = statusResponse.responseJSON.tasks;

    // Function to create HTML table from Csv
    function makeTableHTML(parsedCsvTable) {
      let result = "<table style='width:90%' border=1>";
      for (let i = 0; i < parsedCsvTable.length; i++) {
        if (i === 0) {
          result += "<tr id='firstRow' class='firstRow' >";
        } else {
          result += "<tr>";
        }
        for (let j = 0; j < parsedCsvTable[0].length; j++) {
          let cellValue = parsedCsvTable[i][j];
          if (i === 0) {
            result +=
              "<td id='firstRow'  class='firstRow' style='background-color: darkslategrey'>" + cellValue + "</td>";
          } else {
            result += "<td >" + cellValue + "</td>";
          }
        }
        result += "</tr>";
      }
      result += "</table>";
      return result;
    }

    // Function to create HTML table from Csv
    function makeEditTableHTML(parsedCsvTable) {
      let result = "<table class='buttonsTable' id='buttonsTable' >";
      for (let i = 0; i < parsedCsvTable.length; i++) {
        result +=
          "<tr style='height:' class='buttonsRow'>" +
          "<td class='buttonsColumn' >" +
          "<div class='hideButtons'>" +
          "<button class='addRowButton' id='addRowButton' >" +
          "+" +
          "</button>" +
          "<button class='deleteRowButton' id='deleteRowButton' >" +
          "-" +
          "</button>" +
          "</div>" +
          "</td>" +
          "</tr>";
      }
      result += "</table>";
      result += "<table id='ItemsTable' class='ItemsTable'>";
      for (let i = 0; i < parsedCsvTable.length; i++) {
        for (let j = 0; j < parsedCsvTable[0].length; j++) {
          let cellValue = parsedCsvTable[i][j];
          if (i === 0) {
            if (j === 0) {
              result +=
                "<td id='firstRow'  class='firstRow firstColumn' style='background-color: darkslategrey' contenteditable='true'>" +
                cellValue +
                "</td>";
            } else {
              result +=
                "<td id='firstRow'  class='firstRow' style='background-color: darkslategrey' contenteditable='true'>" +
                cellValue +
                "</td>";
            }
          } else {
            if (j === 0) {
              result += "<td contenteditable='true' class='firstColumn'>" + cellValue + "</td>";
            } else {
              result += "<td contenteditable='true'>" + cellValue + "</td>";
            }
          }
        }
        result += "</tr>";
      }
      result += "</table>";

      // Give time to create the table
      setTimeout(() => {
        let arr = [];
        $("#ItemsTable tr").each(function () {
          arr.push($(this).find("td:first").text());
        });

        $("#ItemsTable tr").find("td:first").toggle();

        // Show Buttons when hovering File rows
        $("#ItemsTable tr").hover(
          function () {
            $("#buttonsTable")[0].firstChild.childNodes[$(this).index()].firstChild.childNodes[0].classList.remove(
              "hideButtons"
            );
          },
          function () {
            $("#buttonsTable")[0].firstChild.childNodes[$(this).index()].firstChild.childNodes[0].classList.add(
              "hideButtons"
            );
          }
        );

        // Show Buttons when hovering Buttons table rows
        $("#buttonsTable tr").hover(
          function () {
            $(this)[0].firstChild.childNodes[0].classList.remove("hideButtons");
          },
          function () {
            $(this)[0].firstChild.childNodes[0].classList.add("hideButtons");
          }
        );

        // Delete hovered Row
        $(".deleteRowButton").on("click", function () {
          // Get index of deleted row
          let rowIndex = this.closest("tr").rowIndex;

          // Delete selected row from both tables
          document.getElementById("ItemsTable").deleteRow(rowIndex);
          document.getElementById("buttonsTable").deleteRow(rowIndex);
        });

        // Add Row
        $(".addRowButton").on("click", function () {
          let rowIndex = this.closest("tr").rowIndex;

          let html = "<td>" + "rowContent" + "</td>";
          let selectedRow = document.getElementById("ItemsTable").getElementsByTagName("tr")[rowIndex];

          let itemsTable = document.getElementById("ItemsTable").getElementsByTagName("tbody")[0];
          let buttonsTable = document.getElementById("buttonsTable").getElementsByTagName("tbody")[0];
          let newIRow = itemsTable.insertRow(rowIndex + 1);
          let newBRow = buttonsTable.insertRow(rowIndex + 1);

          // Add an empty cell for each column of the file
          for (let cell = 0; cell < selectedRow.childNodes.length; cell++) {
            newIRow.insertCell(cell);
          }
          newIRow.setAttribute("contenteditable", "true");

          // New cell for the buttons table
          let newBCell = newBRow.insertCell(0);
          newBCell.classList.add("buttonsColumn");
          // let newBContent = document.createTextNode('But');

          let cell =
            "<td class='buttonsColumn' >" +
            "<div class='hideButtons' id='btnwrap'>" +
            "<button class='addRowButton' id='addRowButton' >" +
            "+" +
            "</button>" +
            "<button class='deleteRowButton' id='deleteRowButton' >" +
            "-" +
            "</button>" +
            "</div>" +
            "</td>";
          // let newBContent2 = document.createElement(cell);

          let newBContent = document.createElement("div");
          newBContent.classList.add("hideButtons");
          newBContent.setAttribute("id", "btnwrap");

          let addButton = document.createElement("button");
          addButton.classList.add("addRowButton");
          addButton.setAttribute("id", "addRowButton");
          addButton.innerText = "+";

          let deleteButton = document.createElement("button");
          deleteButton.classList.add("deleteRowButton");
          deleteButton.setAttribute("id", "deleteRowButton");
          deleteButton.innerText = "-";

          newBContent.append(deleteButton);
          newBCell.append(newBContent);

          // Show Buttons when hovering Buttons table rows
          $("#buttonsTable tr").hover(
            function () {
              $(this)[0].firstChild.childNodes[0].classList.remove("hideButtons");
            },
            function () {
              $(this)[0].firstChild.childNodes[0].classList.add("hideButtons");
            }
          );

          // Show Buttons when hovering File rows
          $("#ItemsTable tr").hover(
            function () {
              $("#buttonsTable")[0].firstChild.childNodes[$(this).index()].firstChild.childNodes[0].classList.remove(
                "hideButtons"
              );
            },
            function () {
              $("#buttonsTable")[0].firstChild.childNodes[$(this).index()].firstChild.childNodes[0].classList.add(
                "hideButtons"
              );
            }
          );

          // Delete hovered Row
          $(".deleteRowButton").on("click", function () {
            // Get index of deleted row
            let rowIndex = this.closest("tr").rowIndex;

            // Delete selected row from both tables
            document.getElementById("ItemsTable").deleteRow(rowIndex);
            document.getElementById("buttonsTable").deleteRow(rowIndex);
          });

          // Add Row
          $(".addRowButton").on("click", function () {
            // $(".addRowButton").trigger("click");
            // $(".addRowButton").one('click',addRow());
          });
        });
      }, 1000);
      return result;
    }

    // Stop the Execution of the workflow
    $("#stopExecution").on("click", function () {
      $.jGrowl.defaults.position = "bottom-left";
      $.jGrowl("Stopping execution...");
      // clearTimeout(rld);
      stopExecution = true;
      $.ajax({
        url: `/v2/kill?ticket_id=${id}`,
        type: "GET",
        async: false,
        success: function (d) {
          $.jGrowl("Execution stopped...");
        },
      });
    });

    // Download Outputs function
    function DownloadUrls(downloadUrls, fileName) {
      for (let url in downloadUrls) {
        let urlChunks = downloadUrls[url].split("/");
        if (fileName !== "") {
          filename = fileName;
        } else {
          filename = urlChunks[urlChunks.length - 2] + "_" + urlChunks[urlChunks.length - 1];
        }

        function Download(completeUrl) {
          let iframe = document.createElement("iframe");
          iframe.setAttribute("id", "iframe" + url);
          document.body.appendChild(iframe);
          let createdFrame = document.getElementById("iframe" + url);

          createdFrame.style.width = "0";
          createdFrame.style.height = "0";
          createdFrame.style.border = "none";
          createdFrame.setAttribute("src", completeUrl);
        }
        Download("http://" + downloadUrls[url]);
      }
    }

    // Save and continue execution button
    $("#continueExecution").on("click", function () {
      // Get data from editor, then re-Run
      let flowchartData = $flowchart.flowchart("getData");
      let regex = /topic_name='(\w+[-]*)*/g; // g allows for multiple match
      let fixedRegex = /{topic_name= .*?}/;
      let topicX = listStatus[2].task_data.match(regex);

      let extractedTopicX = topicX[1].split("'")[1];
      topicX2 = listStatus[2].task_data.split("'")[3];

      let json = {
        operators: {
          0: {
            definition: {
              individual: "TopicX",
              uri: "http://www.khaos.uma.es/khaosteam/lifewatch-workflow#TopicX",
            },
            properties: {
              name: "TopicX",
              description: "TopicX",
              numberofinputs: 0,
              numberofoutputs: 1,
              inputs: {},
              outputs: {
                output_0: {
                  label: extractedTopicX,
                },
              },
              inputClasses: {},
              outputClasses: {
                0: {
                  type: "TopicX",
                  uri: "http://www.khaos.uma.es/khaosteam/lifewatch-workflow#TopicX",
                },
              },
            },
            ontology_mapping: {},
            parameters: [],
            left: 100,
            top: 300,
          },
          1: {
            definition: {
              individual: "ComponentNone",
              uri: "http://www.khaos.uma.es/khaosteam/sensacion/titan-workflow#ComponentNone",
            },
            properties: {
              name: "None",
              description: "None",
              numberofinputs: 1,
              numberofoutputs: 0,
              inputs: {
                0: {
                  label: "Input",
                },
              },
              outputs: {},
              inputClasses: {
                0: {
                  type: "None",
                  uri: "http://www.khaos.uma.es/khaosteam/sensacion/titan-workflow#None",
                },
              },
              outputClasses: {},
            },
            ontology_mapping: {},
            parameters: [],
            left: 420,
            top: 260,
          },
        },
        links: {
          0: {
            fromOperator: 0,
            fromConnector: "output_0",
            fromSubConnector: 0,
            toOperator: 1,
            toConnector: "0",
            toSubConnector: 0,
          },
        },
        operatorTypes: {},
      };

      $.ajax({
        url: `http://192.168.43.199:6544/v2/run`,
        type: "POST",
        data: JSON.stringify(json),
        dataType: "json",
        async: false,
        success: function (d) {
          console.log("En ejecución");
        },
      });
    });

    // Save and Run file button
    let outTopic = null;
    let editedTable = null;
    $("#editFile").on("click", function () {
      var myTableArray = [];
      $("table#ItemsTable tr").each(function () {
        let arrayOfThisRow = [];
        let tableData = $(this).find("td");
        if (tableData.length > 0) {
          tableData.each(function () {
            arrayOfThisRow.push($(this).text());
            if ($(this).text() === "") {
              console.log("has empty fields");
            }
          });
          myTableArray.push(arrayOfThisRow);
        }
      });
      let formatedTable = [];
      for (let fila in myTableArray) {
        formatedTable.push(myTableArray[fila].join().toString() + "\n");
      }

      var blob2 = new Blob(formatedTable, { type: "application/octet-stream" });

      $.jGrowl.defaults.position = "center-right";
      $.jGrowl("Submitting File...");
      $("#wholeFlowchart").addClass("disabledButton");

      let randomName = "File" + Date.now();
      let formData = new FormData();
      formData.set("file", blob2, randomName);
      editedTable = myTableArray;
      axios({
        method: "post",
        url: `/v2/hdfs`,
        data: formData,
        config: {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      }).then(function (response) {
        let Data = response.data;
        let hasHeader = Data.header;
        let del = Data.delimiter;
        let lineDel = Data.line_delimiter;
        let numCol = Data.num_columns.toString();
        let numLines = Data.num_lines.toString();
        let headTypes = "" + Data.types.toString();
        let path = Data.hdfs_path;
        let headNames = "" + Data.header_name.toString();
        let skipRows = Data.skip_rows.toString();
        let encoding = Data.encoding;

        // Execute generic json with topic for TabularX input
        let Json = {
          operators: {
            0: {
              definition: {
                individual: "TabularDatasetPublisherX",
                uri: "http://www.khaos.uma.es/khaosteam/sensacion/titan-workflow#TabularDatasetPublisherX",
              },
              properties: {
                name: "Read Tabular Dataset",
                description: "Load tabular data file (CSV,TSV)",
                numberofinputs: 0,
                numberofoutputs: 1,
                inputs: {},
                outputs: {
                  output_0: {
                    label: outTopic,
                  },
                },
                inputClasses: {},
                outputClasses: {
                  0: {
                    type: "TabularDataSet",
                    uri: "http://www.khaos.uma.es/khaosteam/sensacion/titan-workflow#TabularDataSetX",
                  },
                },
              },
              ontology_mapping: {},
              parameters: [
                {
                  properties: {
                    name: "headerNames",
                    label: "Header Names",
                    value: headNames,
                  },
                  definition: {
                    uri: "http://www.khaos.uma.es/khaosteam/sensacion/titan-workflow#ParameterHeaderNames",
                    type: "http://www.khaos.uma.es/perception/bigowl#List",
                  },
                },
                {
                  properties: {
                    name: "delimiter",
                    label: "Delimiter",
                    value: del,
                  },
                  definition: {
                    uri: "http://www.khaos.uma.es/khaosteam/sensacion/titan-workflow#ParameterColumnDelimiter",
                    type: "http://www.khaos.uma.es/perception/bigowl#String",
                  },
                },
                {
                  properties: {
                    name: "encoding",
                    label: "Encoding",
                    value: encoding,
                  },
                  definition: {
                    uri: "http://www.khaos.uma.es/khaosteam/sensacion/titan-workflow#ParameterEncoding",
                    type: "http://www.khaos.uma.es/perception/bigowl#String",
                  },
                },
                {
                  properties: {
                    name: "hasHeader",
                    label: "Header",
                    value: hasHeader,
                  },
                  definition: {
                    uri: "http://www.khaos.uma.es/khaosteam/sensacion/titan-workflow#ParameterHasHeader",
                    type: "http://www.khaos.uma.es/perception/bigowl#Boolean",
                  },
                },
                {
                  properties: {
                    name: "headerTypes",
                    label: "Header Types",
                    value: headTypes,
                  },
                  definition: {
                    uri: "http://www.khaos.uma.es/khaosteam/sensacion/titan-workflow#ParameterHeaderTypes",
                    type: "http://www.khaos.uma.es/perception/bigowl#List",
                  },
                },
                {
                  properties: {
                    name: "lineDelimiter",
                    label: "Line Delimiter",
                    value: "" + lineDel,
                  },
                  definition: {
                    uri: "http://www.khaos.uma.es/khaosteam/sensacion/titan-workflow#ParameterLineDelimeter",
                    type: "http://www.khaos.uma.es/perception/bigowl#String",
                  },
                },
                {
                  properties: {
                    name: "numberOfColumns",
                    label: "Num of columns",
                    value: numCol,
                  },
                  definition: {
                    uri: "http://www.khaos.uma.es/khaosteam/sensacion/titan-workflow#ParameterNumberOfColumns",
                    type: "http://www.khaos.uma.es/perception/bigowl#Integer",
                  },
                },
                {
                  properties: {
                    name: "numberOfLines",
                    label: "Num of lines",
                    value: numLines,
                  },
                  definition: {
                    uri: "http://www.khaos.uma.es/khaosteam/sensacion/titan-workflow#ParameterNumberOfLines",
                    type: "http://www.khaos.uma.es/perception/bigowl#Integer",
                  },
                },
                {
                  properties: {
                    name: "path",
                    label: "Path",
                    value: path,
                  },
                  definition: {
                    uri: "http://www.khaos.uma.es/khaosteam/sensacion/titan-workflow#ParameterPath",
                    type: "http://www.khaos.uma.es/perception/bigowl#File",
                  },
                },
                {
                  properties: {
                    name: "skiprows",
                    label: "Skip Rows",
                    value: skipRows,
                  },
                  definition: {
                    uri: "http://www.khaos.uma.es/khaosteam/sensacion/titan-workflow#ParameterSkiprows",
                    type: "http://www.khaos.uma.es/perception/bigowl#Integer",
                  },
                },
              ],
              left: 160,
              top: 260,
            },
            1: {
              definition: {
                individual: "ComponentNone",
                uri: "http://www.khaos.uma.es/khaosteam/sensacion/titan-workflow#ComponentNone",
              },
              properties: {
                name: "None",
                description: "None",
                numberofinputs: 1,
                numberofoutputs: 0,
                inputs: {
                  0: {
                    label: "Input",
                  },
                },
                outputs: {},
                inputClasses: {
                  0: {
                    type: "None",
                    uri: "http://www.khaos.uma.es/khaosteam/sensacion/titan-workflow#None",
                  },
                },
                outputClasses: {},
              },
              ontology_mapping: {},
              parameters: [],
              left: 420,
              top: 260,
            },
          },
          links: {
            0: {
              fromOperator: 0,
              fromConnector: "output_0",
              fromSubConnector: 0,
              toOperator: 1,
              toConnector: "0",
              toSubConnector: 0,
            },
          },
          operatorTypes: {},
        };
        $.ajax({
          url: `/v2/run`,
          type: "POST",
          data: JSON.stringify(Json),
          dataType: "json",
          async: false,
          success: function (d) {
            console.log("Running");
          },
        });
      });
    });

    // Loading the workflow into the flowchart
    function loadData(getResponse, listStatus) {
      let metadata = {
        operators: getResponse.responseJSON.operators,
        links: getResponse.responseJSON.links,
      };
      $flowchart.flowchart("setData", metadata, listStatus);
    }
    loadData(getResponse, listStatus);

    for (let op in getResponse.operators) {
      $("#" + op).removeClass("warning");
    }

    function createGraph(table, header, xLabelPos, ySelectedAttrPos) {
      // Separate rows by label
      let labelArrays = [];
      let labels = [];
      for (let row in table) {
        if (row !== "0") {
          // Avoid header
          let label = table[row][xLabelPos]; // default label last column
          let yAxisValue = table[row][ySelectedAttrPos]; // default first attribute
          if (label !== undefined) {
            if (labels.includes(label[0]) === false) {
              labels.push(label[0]);
              let thisLabelArray = [];
              // Create an empty array for each label to save their values
              labelArrays.push(thisLabelArray);
            }
            for (let labelPos in labels) {
              // Cuando la label de esta fila coincida con la posicion guardada
              // Guardo en esa misma de los valores su valor
              if (label[0] === labels[labelPos]) {
                labelArrays[labelPos].push(yAxisValue);
              }
            }
          }
        }
      }
      // Compute avg value of selected y Axis and labels of x Axis.
      let yAxisAvgs = [];
      for (let label in labelArrays) {
        let singleArray = [];
        for (let array in labelArrays[label]) {
          let newArray = singleArray.concat(labelArrays[label][array]);
          singleArray = newArray;
        }
        let sum = 0.0;
        for (let i in singleArray) {
          sum += parseFloat(singleArray[i]);
        }
        let avg = sum / singleArray.length;
        yAxisAvgs.push(avg);
      }
      // media de sepallength con variety
      let rows = [
        {
          points: [],
        },
      ];
      for (let column in labels) {
        let point = {
          x: labels[column],
          y: yAxisAvgs[column],
        };
        rows[0].points.push(point);
      }
      return rows;
    }

    // Function to call when selecting an operator
    function opSelectFunc(operatorId, listStatus) {
      let OpData = $flowchart.flowchart("getOperatorData", operatorId);
      let fileName = "";

      if (OpData.parameters.param_5 !== undefined) {
        let urlChunks = OpData.parameters.param_5.properties.value.split("/");
        fileName = urlChunks[urlChunks.length - 1];
      }
      let thisIndiv = OpData.properties.name.substring(0, OpData.properties.name.length - 1);
      if (isNaN(thisIndiv.slice(-1)) === false) {
        thisIndiv = thisIndiv.substring(0, thisIndiv.length - 1);
      }

      let isReadCsv = thisIndiv === "ComponentImportTabularDataset";
      let isSplit = thisIndiv === "ComponentSplitShuffle";

      document.getElementById("dataTables").innerHTML = "";

      for (let job in listStatus) {
        $("#continueExecution").hide();
        let isCompUserInteraction = listStatus[job].name.includes("ComponentUserInteraction");

        // Find the job corresponding to the clicked one
        if (
          (listStatus[job].name === OpData.properties.name &&
            listStatus[job].status !== "pending" &&
            listStatus[job].status !== "running") || // Cuando su opId coindide con el clickado
          (listStatus[job].name === OpData.properties.name && isCompUserInteraction)
        ) {
          $(".modal").addClass("is-active");
          let editButton = $("#editFile");
          editButton.hide();
          let response = listStatus[job].result.message;
          let urlsToDownload = [];
          let error = false;

          // If component ComponentUserInteraction clicked
          if (isCompUserInteraction) {
            let parts = listStatus[job].task_data;
            let regex = /Topic-(\w+[-]*)*/g; // g allows for multiple match
            let topicNames = parts.match(regex);
            outTopic = topicNames[1];
            let inputTopicName = topicNames[0];
            let url = `/v2/topic_params?topic_name=${inputTopicName}`; // channel 1
            fetch(url)
              .then((res) => res.json())
              .then((data) => {
                setTimeout(() => {
                  urlsToDownload.push(data.resource);
                }, 1000);
                urlsToDownload.push(data.resource);
              })
              .catch((err) => {
                throw err;
              });

            // Fin coger contenido topic de entrada de ComponentUserInteraction
          } else {
            let responseJson;
            let minIOResource;
            if (response.type === "ImportError" || listStatus[job].status === "failed") {
              error = true;
            } else {
              responseJson = JSON.parse(response);
              minIOResource = responseJson.resource;
            }

            if (minIOResource !== undefined) {
              let multipleLinks = Array.isArray(minIOResource);
              if (!multipleLinks) {
                urlsToDownload.push(`192.168.213.23:8090` + minIOResource.split(":")[1]);
              } else if (multipleLinks) {
                for (let url in minIOResource) {
                  urlsToDownload.push(`192.168.213.23:8090` + minIOResource[url].split(":")[1]);
                }
              }
            }
          }

          let OpData = $flowchart.flowchart("getOperatorData", operatorId);
          selectedComponent = OpData.definition.individual;
          let isCheckTax = thisIndiv === "ComponentCheckTaxonomy";
          let isCopernicusLink = thisIndiv === "ComponentCOpernicusLink";
          let isSpatialViewer = thisIndiv === "ComponentSpatialViewer";

          // Clean and hide view
          $("#downloadComponentOutputs").hide();
          $("#log").hide();
          $(".content").text("");
          let selectedOpType = "";

          let myJsonCompsAll = document.componentAll;
          for (let opType in myJsonCompsAll) {
            for (let operator in myJsonCompsAll[opType].operators) {
              if (myJsonCompsAll[opType].operators[operator].properties.name === thisIndiv) {
                selectedOpType = opType.toString();
                break;
              }
            }
          }

          // Wait for selectedOpType to be obtained, refreshing selectedOpType value
          var opTypeInterval = setInterval(async function () {
            if (selectedOpType === "") {
              console.log("wait for opType");
            } else {
              clearInterval(opTypeInterval);

              let typeChunks = "";
              if (OpData.properties.inputs[0] !== undefined) {
                typeChunks = OpData.properties.inputs[0].definition.type.split("/");
              }

              //tabular as input, DataSink(visualizer) case
              if (
                (OpData.properties.inputs[0] !== undefined &&
                  typeChunks[typeChunks.length - 1] === "TabularDataSet" &&
                  selectedOpType === "DataSink") ||
                thisIndiv === "ComponentUserInteraction" || // caso del userInteraction
                isCheckTax // Check Taxonomy case
              ) {
                // Case for displaying tables
                let tables = [];
                let header = [];
                for (let url in urlsToDownload) {
                  let tableFromDownloadedCsv = [];

                  Papa.parse("http://" + urlsToDownload[url], {
                    download: true,
                    delimiter: "",
                    header: {
                      Range: "bytes=0-4000",
                    },
                    step: function (results) {
                      let line = results.data;
                      if (header[0] === undefined) {
                        for (let key in Object.keys(line)) {
                          header.push(Object.keys(line)[key]);
                        }
                      }
                      let arr = Array.from(Object.keys(line), (k) => [line[k]]);
                      tableFromDownloadedCsv.push(arr);
                    },
                  });
                  tables.push(tableFromDownloadedCsv);
                }

                // Wait to get the header
                setTimeout(() => {
                  // xAxisSelect.hide();
                  let chartDiv = $("#chartDiv");
                  let editButton = $("#editFile");
                  let continueExecButton = $("#continueExecution");
                  // Refreshing tables intervals definition
                  let tablesInterval = setInterval(async function () {
                    if (tables[0] === undefined) {
                      console.log("waiting for parsing");
                    } else {
                      clearInterval(tablesInterval);
                      for (let table in tables) {
                        let createdTable = null;
                        document.getElementById("dataTables").innerHTML = "";
                        if (thisIndiv === "ComponentUserInteraction") {
                          document.getElementById("dataTables").innerHTML +=
                            "<h1 style='padding-left: 50%'>Edit File" + " " + "</h1>";

                          let tableToPrint = tables[table];
                          if (editedTable !== null) {
                            tableToPrint = editedTable;
                          }
                          createdTable = makeEditTableHTML(tableToPrint);
                          csvTable = tables[table];
                          $("#graphDiv").hide();
                          continueExecButton.hide();
                          editButton.show();
                        } else if (isCheckTax) {
                          document.getElementById("dataTables").innerHTML += "<h1>Check Taxonomy</h1>";
                          createdTable = makeTableHTML(tables[table]);
                          $("#graphDiv").hide();
                          editButton.hide();
                          continueExecButton.show();
                        } else if (thisIndiv === "ComponenteCSV2Graphic") {
                          $("#graphDiv").show();
                          document.getElementById("dataTables").innerHTML += "<h1>Component CSV to Graphic</h1>";
                          tables[table].unshift(header);
                          createdTable = makeTableHTML(tables[table]);
                          chartDiv.show();

                          // Load select values
                          let yAxisSelect = document.getElementById("yAxis");
                          let xAxisSelect = document.getElementById("xAxis");
                          let graphTypeSelect = document.getElementById("graphType");
                          let graphType = "default";
                          xAxisSelect.show();

                          function addOptionToSelect(option, select) {
                            let newOption = document.createElement("option");
                            newOption.text = option;
                            newOption.value = option;
                            select.add(newOption);
                          }

                          for (let column in header) {
                            addOptionToSelect(header[column], yAxisSelect);
                            addOptionToSelect(header[column], xAxisSelect);
                          }

                          let graphOptions = ["default", "vertical column", "horizontal column", "pie", "area"];
                          for (let option in graphOptions) {
                            addOptionToSelect(graphOptions[option], graphTypeSelect);
                          }

                          xLabelPos = header.length - 1; // default chosen label
                          ySelectedAttrPos = 0; // default chosen first atribute

                          $("#yAxis").on("change", function () {
                            let newYPos = header.indexOf(this.value);
                            let currentXPos = header.indexOf(xAxisSelect.value);
                            let graphType = $("#graphType").val();
                            let rows = createGraph(tables[table], header, currentXPos, newYPos);
                            JSC.Chart("chartDiv", {
                              type: graphType,
                              series: rows,
                            });
                          });

                          $("#xAxis").on("change", function () {
                            let newXPos = header.indexOf(this.value);
                            let currentYPos = header.indexOf(yAxisSelect.value);
                            let graphType = $("#graphType").val();
                            let rows = createGraph(tables[table], header, newXPos, currentYPos);
                            JSC.Chart("chartDiv", {
                              type: graphType,
                              series: rows,
                            });
                          });

                          $("#graphType").on("change", function () {
                            let currentXPos = header.indexOf(xAxisSelect.value);
                            let currentYPos = header.indexOf(yAxisSelect.value);
                            let rows = createGraph(tables[table], header, currentXPos, currentYPos);
                            JSC.Chart("chartDiv", {
                              type: this.value,
                              series: rows,
                            });
                          });

                          let rows = createGraph(tables[table], header, xLabelPos, ySelectedAttrPos);
                          setTimeout(() => {
                            JSC.Chart("chartDiv", {
                              type: graphType,
                              series: rows,
                            });
                          }, 1000);

                          editButton.hide();
                          continueExecButton.hide();
                        } else {
                          tables[table].unshift(header);
                          tables[table].pop();
                          // Load file stats
                          document.getElementById("dataTables").innerHTML += "<h1>Stats</h1>";
                          // Create stats table
                          let statsTable =
                            "<table style='width:90%'>" +
                            "<tr class=statVal>" +
                            "<td class=stat style='background-color: darkslategrey'>Number of Columns</td>" +
                            "<td>" +
                            tables[table][0].length +
                            "</td>" +
                            "</tr>" +
                            "<tr class=statVal>" +
                            "<td class=stat style='background-color: darkslategrey'>Number of Lines</td>" +
                            "<td>" +
                            tables[table].length +
                            "</td>" +
                            "</tr>" +
                            "<tr class=statVal>" +
                            "<td class=stat style='background-color: darkslategrey'>MinIO Path</td>" +
                            "<td>" +
                            urlsToDownload[table] +
                            "</td>" +
                            "</tr>" +
                            "</table>";

                          // Add it to the div
                          document.getElementById("dataTables").innerHTML += statsTable;
                          document.getElementById("dataTables").innerHTML += "<br>" + "<h1>View File</h1>";
                          createdTable = makeTableHTML(tables[table]);
                          editButton.hide();
                          continueExecButton.hide();
                          $("#graphDiv").hide();
                        }

                        document.getElementById("dataTables").innerHTML += createdTable;
                        $(".firstRow").addClass("has-text-white");
                        $("[class=stat]").addClass("has-text-white");
                      }
                    }
                  }, 500);
                }, 500);
              } else if (isSpatialViewer) {
                let editButton = $("#editFile");
                let continueExecButton = $("#continueExecution");
                document.getElementById("dataTables").innerHTML += "<h1>Spatial Viewer</h1>";
                // createdTable = makeTableHTML(tables[table]);
                // print image from source
                let fixedRegex = /{"sources_img": .*?}/;
                let sourceUrls = response.match(fixedRegex);
                let parsedJson = null;

                if (sourceUrl !== null) {
                  parsedJson = JSON.parse(sourceUrl[0]);
                }
                // Download and log image
                // Case for displaying tables
                let image;

                Papa.parse(urlsToDownload[url], {
                  download: true,
                  delimiter: "",
                  header: {
                    Range: "bytes=0-4000",
                  },
                  step: function (results) {
                    let line = results.data;
                    let arr = Array.from(Object.keys(line), (k) => [line[k]]);
                    tableFromDownloadedCsv.push(arr);
                  },
                });
                tables.push(tableFromDownloadedCsv);
                editButton.hide();
                $("#graphDiv").hide();
                continueExecButton.show();
              } else {
                // Download outputs button
                if (error === false) {
                  let downlButton = $("#downloadComponentOutputs");
                  downlButton.show();
                  $("#log").show();
                  $(".content").text(response);
                  document.getElementById("dataTables").innerHTML = "";

                  $("#downloadComponentOutputs")
                    .off("click")
                    .on("click", function () {
                      DownloadUrls(urlsToDownload, fileName);
                    });

                  $("#graphDiv").hide();
                } else {
                  $("#log").show();
                  $(".content").text(response.type + " " + response.message);
                  document.getElementById("dataTables").innerHTML = "";
                }
              }
            }
          }, 100);

          break;
        }
      }
      return true;
    }

    // Function to call when refreshing data each interval
    async function refreshOperators() {
      $.ajax({
        url: `/api/v2/workflow/status?workflow_id=${id}`,
        type: "GET",
        headers: {
          Authorization: "Bearer " + document.cookie,
        },
        async: false,
        statusCode: {
          404: function () {
            console.log("404 not found!");
          },
          401: function () {
            console.log("401 Invalid credentials!");
          },
          200: function () {},
        },
        complete: function (response) {
          if (response.statusText === "OK") {
            let listStatus = response.responseJSON.tasks;
            $.ajax({
              url: `/api/v2/workflow/get?workflow_id=${id}`,
              type: "GET",
              headers: {
                Authorization: "Bearer " + document.cookie,
              },
              async: false,
              statusCode: {
                404: function () {
                  console.log("404 not found!");
                },
                401: function () {
                  console.log("401 Invalid credentials!");
                },
                200: function () {},
              },
              complete: function (response) {
                getResponse = response;
                let metadata = {
                  operators: getResponse.responseJSON.operators,
                  links: getResponse.responseJSON.links,
                };
                $flowchart.flowchart("setData", metadata, listStatus);

                for (let op in getResponse.responseJSON.operators) {
                  $("#" + op).removeClass("warning");
                }
                $flowchart.flowchart({
                  onOperatorSelect: async function (operatorId) {
                    opSelectFunc(operatorId, listStatus);
                  },
                });
              },
            });
          } else if (response.statusText === "Unauthorized") {
            console.log("Unauthorized");
          }
        },
      });
    }

    // Refreshing data intervals definition
    let interval = setInterval(async function () {
      document.dataSinkOps;
      let stop =
        listStatus.every((task) => task.status == "done") ||
        listStatus.some((task) => task.status == "failed" && !document.dataSinkOps.includes(task.name));

      if (stop === false && !stopExecution) {
        // Stop if some task failed, or all tasks are done
        await refreshOperators();
      } else {
        clearInterval(interval);
        await refreshOperators();
      }
    }, 5000);
  });

  // Delayed activation of the flowchart to give time to load
  setTimeout(() => {
    $("#new-flowchartStatus").trigger("click");
  }, 300);

  // Close data modal
  $("#closeModal").on("click", function () {
    if ($(".modal").hasClass("is-active")) {
      $(".modal").removeClass("is-active");
    }
  });
});
