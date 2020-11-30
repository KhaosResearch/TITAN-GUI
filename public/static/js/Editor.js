$(window).on("load", async function () {
  let Operators = [];
  let DataOperations = [];
  document.dataCollectionOps = [];
  document.dataSinkOps = [];
  document.globalIndividualsInputsOutputs = [[]];
  document.numOfOps = [];
  let individualsInputsOutputs = [[]];
  let operatorSearchIndex = [];

  // Function to load Menu Operators/Components
  let loadComponents = function (myJson) {
    let modulesByName = [];
    let index = 0;
    for (var opType in myJson) {
      DataOperations.push(myJson[opType]);
      var genericDiv = document.getElementById(opType);
      myJson[opType].operators.forEach(function (p) {
        Operators.push(p);
        let name = p.properties.name;
        let operatorLabel = p.properties.label;
        let ins = p.properties.ninputs;
        let outs = p.properties.noutputs;
        let module = p.properties.module;

        if (outs === 0) {
          document.dataSinkOps.push(name);
        }

        let thisOpNameModule = [];
        thisOpNameModule.push(name);
        thisOpNameModule.push(module);
        modulesByName.push(thisOpNameModule);
        let baseOp = [name, 0];
        document.numOfOps.push(baseOp);

        if (index >= 0) {
          let insouts = [name, p.properties.inputs, p.properties.outputs];
          individualsInputsOutputs.push(insouts);
        }
        var completeOperatorDiv = $("<div><div />");
        completeOperatorDiv.attr("id", "complete" + name);
        var operatorDiv = $("<div>" + operatorLabel + "<div />");

        operatorDiv.attr({
          id: name,
          label: operatorLabel,
          title: "* " + p.properties.description,
          "nb-data-name": name,
          "nb-data-description": p.properties.description,
          "nb-data-uri": p.definition.uri,
          "nb-data-module": module,
          "nb-inputs": ins,
          "nb-outputs": outs,
          inputs: ins,
          outputs: outs,
        });

        let opIndex = {
          name: name,
          opType: opType,
        };
        operatorSearchIndex.push(opIndex);

        operatorDiv.addClass("draggable-operator ui-draggable ui-draggable-handle");
        let operatorConnections = $("<p>" + "Inputs : " + ins + "     Outputs : " + outs + "</p>");
        operatorConnections.attr("style", "white-space: pre");
        operatorConnections.addClass("help");

        operatorDiv.appendTo(completeOperatorDiv);
        operatorConnections.appendTo(completeOperatorDiv);
        completeOperatorDiv.appendTo(genericDiv);
        index++;
      });
    }
    document.modules = modulesByName;
  };

  // Fetching components
  fetch(`/api/v2/semantic/component/get/all`)
    .then(function (response) {
      return response.json();
    })
    .then(function (myJson) {
      for (let indiv in myJson.DataCollection.operators) {
        document.dataCollectionOps.push(myJson.DataCollection.operators[indiv].properties.name);
      }
      document.componentAll = myJson;
      loadComponents(myJson);
      document.globalIndividualsInputsOutputs = individualsInputsOutputs;
    });

  function mainSearch(searchString) {
    const options = {
      // isCaseSensitive: false,
      // includeScore: false,
      // shouldSort: true,
      // includeMatches: false,
      // findAllMatches: false,
      // minMatchCharLength: 1,
      // location: 0,
      // threshold: 0.6,
      // distance: 100,
      // useExtendedSearch: false,
      // ignoreLocation: false,
      // ignoreFieldNorm: false,
      keys: ["name", "opType"],
      // Searching by operator name and type
    };
    const fuse = new Fuse(operatorSearchIndex, options);
    const pattern = searchString;

    return fuse.search(pattern);
  }

  // Gather changes on the search input
  $("#searchBar").on("change keydown paste input", function () {
    let pattern = mainSearch($("#searchBar").val());
    // If search is not null Hide all operators

    for (let operator in Operators) {
      let idUri = Operators[operator].properties.name;
      if ($("#searchBar").val() !== "") {
        $("#complete" + idUri).hide();
      } else {
        $("#complete" + idUri).show();
      }
    }

    // Show operators returned by Fuse.js
    pattern.forEach(function (op) {
      $("#" + "complete" + op.item.name)[0].style.display = "block";
    });
  });
});
