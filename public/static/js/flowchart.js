$(function () {
  $.widget("flowchart.flowchart", {
    // default options
    options: {
      canUserEditLinks: true,
      canUserMoveOperators: true,
      data: {},
      distanceFromArrow: 3,
      defaultOperatorClass: "flowchart-default-operator",
      defaultLinkColor: "#3366ff",
      defaultSelectedLinkColor: "black",
      linkWidth: 10,
      grid: 20,
      multipleLinksOnOutput: false,
      multipleLinksOnInput: true,
      linkVerticalDecal: 0,
      onOperatorSelect: function (operatorId) {
        return true;
      },
      onOperatorUnselect: function () {
        return true;
      },
      onOperatorMouseOver: function (operatorId) {
        return true;
      },
      onOperatorMouseOut: function (operatorId) {
        return true;
      },
      onLinkSelect: function (linkId) {
        return true;
      },
      onLinkUnselect: function () {
        return true;
      },
      onOperatorCreate: function (operatorId, operatorData, fullElement) {
        return true;
      },
      onLinkCreate: function (linkId, linkData) {
        return true;
      },
      onOperatorDelete: function (operatorId) {
        return true;
      },
      onLinkDelete: function (linkId, forced) {
        return true;
      },
      onOperatorMoved: function (operatorId, position) {},
      onAfterChange: function (changeType) {},
    },
    data: null,
    objs: null,
    maskNum: 0,
    linkNum: 0,
    operatorNum: 0,
    lastOutputConnectorClicked: null,
    selectedOperatorId: null,
    selectedLinkId: null,
    positionRatio: 1,
    globalId: null,
    ticketId: null,
    listStatus: null,
    OperatorConnections: [],

    // the constructor
    _create: function () {
      if (typeof document.__flowchartNumber == "undefined") {
        document.__flowchartNumber = 0;
      } else {
        document.__flowchartNumber++;
      }
      this.globalId = document.__flowchartNumber;
      this._unitVariables();

      this.element.addClass("flowchart-container");

      this.objs.layers.links = $('<svg class="flowchart-links-layer"></svg>');
      this.objs.layers.links.appendTo(this.element);

      this.objs.layers.operators = $('<div class="flowchart-operators-layer unselectable"></div>');
      this.objs.layers.operators.appendTo(this.element);

      this.objs.layers.temporaryLink = $('<svg class="flowchart-temporary-link-layer"></svg>');
      this.objs.layers.temporaryLink.appendTo(this.element);

      var anim = document.createElementNS("http://www.w3.org/2000/svg", "animate");
      anim.setAttribute("id", "dash-animation");
      anim.setAttribute("begin", "indefinite");
      anim.setAttribute("from", "400");
      anim.setAttribute("to", "0");
      anim.setAttribute("fill", "freeze");
      anim.setAttribute("dur", "10s");
      anim.setAttribute("repeatCount", "indefinite");
      anim.setAttribute("attributeName", "stroke-dashoffset");

      var shape = document.createElementNS("http://www.w3.org/2000/svg", "line");
      shape.setAttribute("x1", "0");
      shape.setAttribute("y1", "0");
      shape.setAttribute("x2", "0");
      shape.setAttribute("y2", "0");
      shape.setAttribute("stroke-dasharray", "8");
      shape.setAttribute("stroke-width", "4");
      shape.setAttribute("stroke", "#f65959");
      shape.setAttribute("fill", "none");
      shape.appendChild(anim);

      this.objs.layers.temporaryLink[0].appendChild(shape);
      this.objs.temporaryLink = shape;

      this._initEvents();

      if (typeof this.options.data != "undefined") {
        this.setData(this.options.data, undefined, false);
      }
    },

    _unitVariables: function () {
      this.data = {
        operators: {},
        links: {},
      };
      this.objs = {
        layers: {
          operators: null,
          temporaryLink: null,
          links: null,
        },
        linksContext: null,
        temporaryLink: null,
      };
    },

    _initEvents: function () {
      var self = this;

      this.element.mousemove(function (e) {
        var $this = $(this);
        var offset = $this.offset();
        self._mousemove((e.pageX - offset.left) / self.positionRatio, (e.pageY - offset.top) / self.positionRatio, e);
      });

      this.element.click(function (e) {
        var $this = $(this);
        var offset = $this.offset();
        self._click((e.pageX - offset.left) / self.positionRatio, (e.pageY - offset.top) / self.positionRatio, e);
      });

      this.objs.layers.operators.on("pointerdown mousedown touchstart", ".flowchart-operator", function (e) {
        e.stopImmediatePropagation();
      });

      this.objs.layers.operators.on("click", ".flowchart-operator", function (e) {
        if ($(e.target).closest(".flowchart-operator-connector").length === 0) {
          self.selectOperator($(this).data("operator_id"));
        }
      });

      this.objs.layers.operators.on("click", ".flowchart-operator-connector-arrow", function () {
        var $this = $(this);
        if (self.options.canUserEditLinks) {
          self._arrowClicked(
            $this.closest(".flowchart-operator").data("operator_id"),
            $this.closest(".flowchart-operator-connector").data("connector"),
            $this.closest(".flowchart-operator-connector").data("sub_connector"),
            $this.closest(".flowchart-operator-connector-set").data("connector_type")
          );
        }
      });

      this.objs.layers.links.on("mousedown touchstart", ".flowchart-link", function (e) {
        e.stopImmediatePropagation();
      });

      this.objs.layers.links.on("mouseover", ".flowchart-link", function () {
        self._connecterMouseOver($(this).data("link_id"));
      });

      this.objs.layers.links.on("mouseout", ".flowchart-link", function () {
        self._connecterMouseOut($(this).data("link_id"));
      });

      this.objs.layers.links.on("click", ".flowchart-link", function () {
        self.selectLink($(this).data("link_id"));
      });

      this.objs.layers.operators.on("mouseover", ".flowchart-operator", function (e) {
        self._operatorMouseOver($(this).data("operator_id"));
      });

      this.objs.layers.operators.on("mouseout", ".flowchart-operator", function (e) {
        self._operatorMouseOut($(this).data("operator_id"));
      });
    },

    setData: function (data, listStatus, isImport) {
      this._clearOperatorsLayer();
      this.data.operators = {};
      let idOpAnterior = 0;
      for (let operatorId in data.operators) {
        if (data.operators.hasOwnProperty(operatorId)) {
          if (listStatus === undefined) {
            this.createOperator(operatorId, data.operators[operatorId], undefined);
          } else {
            this.createOperator(operatorId, data.operators[operatorId], listStatus[idOpAnterior].status);
            idOpAnterior++;
          }
        }
      }
      this.data.links = {};

      // En status o editor normal
      if (listStatus !== undefined) {
        for (var linkId in data.links) {
          if (data.links.hasOwnProperty(linkId)) {
            this.createLink(linkId, data.links[linkId]);
          }
        }
        this.redrawLinksLayer();
        // Con import workflow. Si ese es su caller
      } else if (isImport) {
        let oldLinks = this.objs.layers.links[0].children;
        this.redrawLinksLayer();
        for (let link in data.links) {
          if (data.links[link] !== undefined) {
            let linkData = data.links[link];
            let output = $("#" + data.links[link].fromOperator)[0].lastChild.lastChild;

            let fromConnectorId = linkData.fromConnector[linkData.fromConnector.length - 1]; // Coger núm del final de output_0, más uno
            fromConnectorId++;

            let outArrow = output.childNodes[fromConnectorId].childNodes[1].childNodes[1];
            let input = $("#" + linkData.toOperator)[0].lastChild.firstChild;

            let toConnectorId = linkData.toConnector;
            toConnectorId++;
            let inArrow = input.childNodes[toConnectorId].childNodes[1].childNodes[1];

            outArrow.click();
            inArrow.click();
          }
        }
      } else {
        for (var linkId in data.links) {
          if (data.links.hasOwnProperty(linkId)) {
            this.createLink(linkId, data.links[linkId]);
          }
        }
        this.redrawLinksLayer();
      }
    },

    // Get connected operators
    getConnectedOperators: function (fromOp, toOp) {
      let operators = this.objs.layers.operators[0].children;
      let connectedOperators = [];
      let fromOpId = fromOp.getAttribute("id");
      let toOpId = toOp.getAttribute("id");
      for (let op = 0; op < operators.length; op++) {
        let currentId = operators[op].getAttribute("id");
        if (currentId === fromOpId || currentId === toOpId) {
          connectedOperators.push(operators[op]);
        }
      }
      return connectedOperators;
    },

    validateWorkflowConnections: function () {
      let operators = this.objs.layers.operators[0].children;
      for (let op in operators) {
        let links = this.objs.layers.links[0].children;
        for (let link in links) {
          let linkId = links[link].children[1].getAttribute("data-link_id");
          let linkData = this.data.links[linkId];
          this.validateSingleComponentConnections(op, true, linkData);
        }
      }
    },

    incompatibleConnectors: async function (outputOpId, inputOpId, fromConnector, toConnector) {
      let incompatible = null;
      let data = this.getOperatorData(outputOpId);
      let data2 = this.getOperatorData(inputOpId);
      let outputType2 = data.properties.outputs[fromConnector].definition.type.split("#")[1];
      let inputType = data2.properties.inputs[toConnector].definition.type.split("#")[1];
      incompatible = outputType2 !== inputType;
      return incompatible;
    },

    // function to Validate single component
    validateSingleComponentConnections: function (operator, isLinkOperation, linkData) {
      let opConnectors = operator.lastChild;
      // Obtain input and output connector sets
      if (opConnectors !== undefined && opConnectors !== null) {
        let opInputConnectorSet = opConnectors.firstChild; // Input connector set
        let opOutputConnectorSet = opConnectors.lastChild;
        // Output connector set

        // Obtain if it has input and output connectors inside connector sets
        let opHasInputConnectors = opInputConnectorSet.childNodes.length > 1;
        let opHasOutputConnectors = opOutputConnectorSet.childNodes.length > 1;

        // Obtain the connector nodes
        let inputConnectors = {};
        let outputConnectors = {};
        let numInputConnectors = 0;
        let numOutputConnectors = 0;
        if (opHasInputConnectors) {
          inputConnectors = opInputConnectorSet.childNodes;
          // Enter the input connector set, get the children nodes
          numInputConnectors = (inputConnectors.length - 1).toString();
        }
        if (opHasOutputConnectors) {
          outputConnectors = opOutputConnectorSet.childNodes;
          numOutputConnectors = (outputConnectors.length - 1).toString();
        }

        // Check if there are unused connectors
        let currentOperatorId = operator.getAttribute("id");
        let numInputConnectors_Data = 0;
        let numOutputConnectors_Data = 0;
        let numDifOutputConnectors_Data = 0;
        let data = this.getData();
        let lastConnector = "";

        for (let link in data.links) {
          if (data.links[link].fromOperator.toString() === currentOperatorId) {
            numOutputConnectors_Data++;
          }
          if (data.links[link].toOperator.toString() === currentOperatorId) {
            numInputConnectors_Data++;
          }
          let lastConnector = "";
          if (
            data.links[link].fromConnector.toString() + currentOperatorId !==
            lastConnector.toString() + currentOperatorId
          ) {
            numDifOutputConnectors_Data++;
          }
          lastConnector = data.links[link].fromConnector.toString() + currentOperatorId;
        }

        // Check state of the operator connections
        let opHasUnusedInputConnectors = numInputConnectors.toString() !== numInputConnectors_Data.toString();
        let opHasUnusedOutputConnectors = numOutputConnectors.toString() > numOutputConnectors_Data.toString();

        let opHasAnyUsedOutputConnectors = numOutputConnectors_Data > 0;
        let opTitle = operator.firstChild.firstChild;

        // Si el número de output conectors DIFERENTES usados no coincide
        // let opHasUnusedOutputConnectors2 = numDifOutputConnectors_Data.toString() < numOutputConnectors.toString(); //Diferentes si parten de conector diferente
        // Delete existing span element, if it does exist; delete previous existing classes as well.

        if (opTitle.firstChild.firstChild !== undefined && opTitle.firstChild.firstChild !== null) {
          opTitle.firstChild.firstChild.innerHTML = "";
        }

        opTitle.title = "";

        // Check if connectors used are incompatible
        let incompatibleConnectors = true;
        if (isLinkOperation) {
          this.incompatibleConnectors(
            linkData.fromOperator,
            linkData.toOperator,
            linkData.fromConnector,
            linkData.toConnector
          ).then((result) => {
            let classes = operator.classList;
            let links = this.objs.layers.links[0].children;
            incompatibleConnectors = result;
            if (
              (opHasUnusedInputConnectors && opHasUnusedOutputConnectors && !opHasAnyUsedOutputConnectors) ||
              (opHasUnusedOutputConnectors && !opHasUnusedInputConnectors) || // Read component-any comp with existing output not connected
              (opHasUnusedInputConnectors && !opHasOutputConnectors)
            ) {
              // View component

              let spanElement = document.createElement("span");
              spanElement.classList.add("fas", "fa-exclamation-triangle", "yellow", "warnSpan");

              if (!classes.contains("warning") && !classes.contains("error")) {
              }

              if (opTitle.firstChild.firstChild !== null) {
                opTitle.firstChild.firstChild.prepend(spanElement);
              }

              opTitle.setAttribute("title", "Unconnected Operator");
            } else if (
              (opHasUnusedInputConnectors && opHasOutputConnectors && !opHasUnusedOutputConnectors) ||
              (opHasUnusedInputConnectors && opHasOutputConnectors && opHasAnyUsedOutputConnectors) ||
              incompatibleConnectors
            ) {
              operator.classList.add("error");
              let spanElement = document.createElement("span");
              spanElement.classList.add("fas", "fa-exclamation-circle", "red");
              if (!classes.contains("warning") && !classes.contains("error")) {
                // opTitle.firstChild.firstChild.prepend(spanElement);
                opTitle.prepend(spanElement);
              }
              opTitle.firstChild.firstChild.prepend(spanElement);

              if (isLinkOperation) {
                if (incompatibleConnectors) {
                  // Si son de tipos incompatibles
                  opTitle.setAttribute("title", "Incompatible input and output types");
                  let link = links[0].children[1].children[0]; // Cambiar para el link creado
                  link.innerHTML += "<title>Incompatible input and output types</title>";
                } else {
                  opTitle.setAttribute("title", "Missing Input");
                }
              }
            } else if (!opHasUnusedInputConnectors && !opHasUnusedInputConnectors) {
              // Dejar blanco
              opTitle.setAttribute("title", "");
            }
          });
        } else {
          if (
            (opHasUnusedInputConnectors && opHasUnusedOutputConnectors && !opHasAnyUsedOutputConnectors) ||
            (opHasUnusedOutputConnectors && !opHasUnusedInputConnectors) || // Read component-any comp with existing output not connected
            (opHasUnusedInputConnectors && !opHasOutputConnectors)
          ) {
            // View component

            let classes = operator.classList;
            if (!classes.contains("warning")) {
              classes.add("warning");
            }

            let spanElement = document.createElement("span");
            spanElement.classList.add("fas", "fa-exclamation-triangle", "yellow");
            opTitle.prepend(spanElement);
            opTitle.setAttribute("title", "Unconnected Operator");
          } else {
            operator.classList.remove("warning");
            opTitle.setAttribute("title", "");
          }
        }
      }
    },

    // Validate componentConnections
    validateComponentConnections: function (fromOp, toOp, linkData) {
      let connectedOperators = this.getConnectedOperators(fromOp, toOp);
      for (let op in connectedOperators) {
        this.validateSingleComponentConnections(connectedOperators[op], true, linkData);
      }
    },

    addLink: function (linkData) {
      while (typeof this.data.links[this.linkNum] != "undefined") {
        this.linkNum++;
      }

      this.createLink(this.linkNum, linkData);
      let originConnector = linkData.fromConnector;
      let destinyConnector = linkData.toConnector;
      let outputNumber = originConnector.charAt(originConnector.length - 1);
      let inputNumber = destinyConnector.charAt(destinyConnector.length - 1);
      let fromOp = $("#" + linkData.fromOperator)[0];
      let toOp = $("#" + linkData.toOperator)[0];
      let originTopicLabel = fromOp.lastChild.lastChild.children[outputNumber].children[0].children[0].textContent;
      toOp.lastChild.children[0].children[inputNumber].children[0].children[0].textContent = originTopicLabel;

      let oldData = this.getOperatorData(toOp.id);
      oldData.properties.inputs[inputNumber].label = originTopicLabel;

      this.OperatorConnections.push(linkData);
      // Si el tipo de entrada y salida son incompatibles, se crea con error marcado.
      this.validateComponentConnections(fromOp, toOp, linkData);
      return this.linkNum;
    },

    createLink: function (linkId, linkDataOriginal) {
      let linkData = $.extend(true, {}, linkDataOriginal);
      if (!this.options.onLinkCreate(linkId, linkData)) {
        return;
      }
      let subConnectors = this._getSubConnectors(linkData);
      let fromSubConnector = subConnectors[0];
      let toSubConnector = subConnectors[1];

      let multipleLinksOnOutput = this.options.multipleLinksOnOutput;
      let multipleLinksOnInput = this.options.multipleLinksOnInput;
      if (!multipleLinksOnOutput || !multipleLinksOnInput) {
        for (let linkId2 in this.data.links) {
          if (this.data.links.hasOwnProperty(linkId2)) {
            let currentLink = this.data.links[linkId2];

            let currentSubConnectors = this._getSubConnectors(currentLink);
            let currentFromSubConnector = currentSubConnectors[0];
            let currentToSubConnector = currentSubConnectors[1];

            if (
              !multipleLinksOnOutput &&
              currentLink.fromOperator === linkData.fromOperator &&
              currentLink.fromConnector === linkData.fromConnector &&
              currentFromSubConnector === fromSubConnector
            ) {
              this.deleteLink(linkId2);
              continue;
            }
            if (
              !multipleLinksOnInput &&
              currentLink.toOperator === linkData.toOperator &&
              currentLink.toConnector === linkData.toConnector &&
              currentToSubConnector === toSubConnector
            ) {
              this.deleteLink(linkId2);
            }
          }
        }
      }
      this._autoCreateSubConnector(linkData.fromOperator, linkData.fromConnector, "outputs", fromSubConnector);
      this._autoCreateSubConnector(linkData.toOperator, linkData.toConnector, "inputs", toSubConnector);

      this.data.links[linkId] = linkData;
      this._drawLink(linkId);

      this.options.onAfterChange("link_create");
    },

    _autoCreateSubConnector: function (operator, connector, connectorType, subConnector) {
      var connectorInfos = this.data.operators[operator].properties[connectorType][connector];
      if (connectorInfos.multiple) {
        var fromFullElement = this.data.operators[operator].internal.els;
        var nbFromConnectors = this.data.operators[operator].internal.els.connectors[connector].length;
        for (var i = nbFromConnectors; i < subConnector + 2; i++) {
          this._createSubConnector(connector, connectorInfos, fromFullElement);
        }
      }
    },

    redrawLinksLayer: function () {
      this._clearLinksLayer();
      for (var linkId in this.data.links) {
        if (this.data.links.hasOwnProperty(linkId)) {
          this._drawLink(linkId);
        }
      }
    },

    _clearLinksLayer: function () {
      this.objs.layers.links.empty();
      this.objs.layers.operators
        .find(".flowchart-operator-connector-small-arrow")
        .css("border-left-color", "transparent");
    },

    _clearOperatorsLayer: function () {
      this.objs.layers.operators.empty();
    },

    cleanLayers: function () {
      this.objs.layers.operators.empty();
      this.objs.layers.links.empty();
    },

    getConnectorPosition: function (operatorId, connectorId, subConnector) {
      var operatorData = this.data.operators[operatorId];
      var $connector = operatorData.internal.els.connectorArrows[connectorId][subConnector];

      var connectorOffset = $connector.offset();
      var elementOffset = this.element.offset();

      var x = (connectorOffset.left - elementOffset.left) / this.positionRatio;
      var width = parseInt($connector.css("border-top-width"));
      var y =
        (connectorOffset.top - elementOffset.top - 1) / this.positionRatio +
        parseInt($connector.css("border-left-width"));

      return { x: x, width: width, y: y };
    },

    getLinkMainColor: function (linkId) {
      var color = this.options.defaultLinkColor;
      var linkData = this.data.links[linkId];
      if (typeof linkData.color != "undefined") {
        color = linkData.color;
      }
      return color;
    },

    setLinkMainColor: function (linkId, color) {
      this.data.links[linkId].color = color;
      this.options.onAfterChange("link_change_main_color");
    },

    _drawLink: function (linkId) {
      var linkData = this.data.links[linkId];

      if (typeof linkData.internal == "undefined") {
        linkData.internal = {};
      }
      linkData.internal.els = {};

      var fromOperatorId = linkData.fromOperator;
      var fromConnectorId = linkData.fromConnector;
      var toOperatorId = linkData.toOperator;
      var toConnectorId = linkData.toConnector;

      var subConnectors = this._getSubConnectors(linkData);
      var fromSubConnector = subConnectors[0];
      var toSubConnector = subConnectors[1];

      var color = this.getLinkMainColor(linkId);

      var fromOperator = this.data.operators[fromOperatorId];
      var toOperator = this.data.operators[toOperatorId];

      var fromSmallConnector = fromOperator.internal.els.connectorSmallArrows[fromConnectorId][fromSubConnector];
      var toSmallConnector = toOperator.internal.els.connectorSmallArrows[toConnectorId][toSubConnector];

      linkData.internal.els.fromSmallConnector = fromSmallConnector;
      linkData.internal.els.toSmallConnector = toSmallConnector;

      var overallGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      this.objs.layers.links[0].appendChild(overallGroup);
      linkData.internal.els.overallGroup = overallGroup;

      var mask = document.createElementNS("http://www.w3.org/2000/svg", "mask");
      var maskId = "fc_mask_" + this.globalId + "_" + this.maskNum;
      this.maskNum++;
      mask.setAttribute("id", maskId);

      overallGroup.appendChild(mask);

      var shape = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      shape.setAttribute("x", "0");
      shape.setAttribute("y", "0");
      shape.setAttribute("width", "100%");
      shape.setAttribute("height", "100%");
      shape.setAttribute("stroke", "none");
      shape.setAttribute("fill", "white");
      mask.appendChild(shape);

      var shape_polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      shape_polygon.setAttribute("stroke", "none");
      shape_polygon.setAttribute("fill", "black");
      mask.appendChild(shape_polygon);
      linkData.internal.els.mask = shape_polygon;

      var group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      group.setAttribute("class", "flowchart-link");
      group.setAttribute("data-link_id", linkId);
      overallGroup.appendChild(group);

      var shape_path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      shape_path.setAttribute("stroke-width", this.options.linkWidth.toString());
      shape_path.setAttribute("fill", "none");
      group.appendChild(shape_path);
      linkData.internal.els.path = shape_path;

      var shape_rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      shape_rect.setAttribute("stroke", "none");
      shape_rect.setAttribute("mask", "url(#" + maskId + ")");
      group.appendChild(shape_rect);
      linkData.internal.els.rect = shape_rect;

      this._refreshLinkPositions(linkId);
      this.uncolorizeLink(linkId);
    },

    _getSubConnectors: function (linkData) {
      var fromSubConnector = 0;
      if (typeof linkData.fromSubConnector != "undefined") {
        fromSubConnector = linkData.fromSubConnector;
      }
      var toSubConnector = 0;
      if (typeof linkData.toSubConnector != "undefined") {
        toSubConnector = linkData.toSubConnector;
      }
      return [fromSubConnector, toSubConnector];
    },

    _refreshLinkPositions: function (linkId) {
      var linkData = this.data.links[linkId];

      var subConnectors = this._getSubConnectors(linkData);
      var fromSubConnector = subConnectors[0];
      var toSubConnector = subConnectors[1];
      var fromPosition = this.getConnectorPosition(linkData.fromOperator, linkData.fromConnector, fromSubConnector);
      var toPosition = this.getConnectorPosition(linkData.toOperator, linkData.toConnector, toSubConnector);

      var fromX = fromPosition.x;
      var offsetFromX = fromPosition.width;
      var fromY = fromPosition.y;
      var toX = toPosition.x;
      var toY = toPosition.y;

      fromY += this.options.linkVerticalDecal;
      toY += this.options.linkVerticalDecal;
      var distanceFromArrow = this.options.distanceFromArrow;
      linkData.internal.els.mask.setAttribute(
        "points",
        fromX +
          "," +
          (fromY - offsetFromX - distanceFromArrow) +
          " " +
          (fromX + offsetFromX + distanceFromArrow) +
          "," +
          fromY +
          " " +
          fromX +
          "," +
          (fromY + offsetFromX + distanceFromArrow)
      );

      var bezierFromX = fromX + offsetFromX + distanceFromArrow;
      var bezierToX = toX + 1;
      var bezierIntensity = Math.min(100, Math.max(Math.abs(bezierFromX - bezierToX) / 2, Math.abs(fromY - toY)));
      linkData.internal.els.path.setAttribute(
        "d",
        "M" +
          bezierFromX +
          "," +
          fromY +
          " C" +
          (fromX + offsetFromX + distanceFromArrow + bezierIntensity) +
          "," +
          fromY +
          " " +
          (toX - bezierIntensity) +
          "," +
          toY +
          " " +
          bezierToX +
          "," +
          toY
      );

      linkData.internal.els.rect.setAttribute("x", fromX);
      linkData.internal.els.rect.setAttribute("y", fromY - this.options.linkWidth / 2);
      linkData.internal.els.rect.setAttribute("width", offsetFromX + distanceFromArrow + 1);
      linkData.internal.els.rect.setAttribute("height", this.options.linkWidth);
    },

    getOperatorCompleteData: function (operatorData) {
      if (typeof operatorData.internal == "undefined") {
        operatorData.internal = {};
      }
      this._refreshInternalProperties(operatorData);
      var infos = $.extend(true, {}, operatorData.internal.properties);

      for (var connectorId_i in infos.inputs) {
        if (infos.inputs.hasOwnProperty(connectorId_i)) {
          if (infos.inputs[connectorId_i] == null) {
            delete infos.inputs[connectorId_i];
          }
        }
      }

      for (var connectorId_o in infos.outputs) {
        if (infos.outputs.hasOwnProperty(connectorId_o)) {
          if (infos.outputs[connectorId_o] == null) {
            delete infos.outputs[connectorId_o];
          }
        }
      }

      if (typeof infos.class == "undefined") {
        infos.class = this.options.defaultOperatorClass;
      }
      return infos;
    },

    _getOperatorFullElement: function (operatorData, operatorStatus) {
      var infos = this.getOperatorCompleteData(operatorData);
      var $operator = $('<div id ="" class="flowchart-operator"></div>');
      $operator.addClass(infos.class);
      var title;
      var content;
      let colour_state;
      let label = infos.name.substring(9, infos.name.length - 1);
      if (isNaN(label.slice(-1)) === false) {
        label = label.substring(0, label.length - 1);
      }

      let separatedLabel = label.replace(/((?<=[a-z])[A-Z]|[A-Z](?=[a-z]))/g, " $1").trim();
      console.log(separatedLabel);

      if (operatorStatus != null) {
        let symbol;
        if (operatorStatus === "done") {
          colour_state = '<span class="flowchart-success">';
          symbol = "✔ ";
        } else if (operatorStatus === "failed") {
          colour_state = '<span class="flowchart-fail">';
          symbol = "✘ ";
        } else if (operatorStatus === "running") {
          colour_state = '<span class="flowchart-fail">';
          symbol = "<div class='spinner'>⚙️</div> ";
        } else if (operatorStatus === "pending") {
          colour_state = '<span class="flowchart-pending">';
          symbol = "<div class='spinner'>⌛</div> ";
        }

        title =
          '<div class ="flowchart-operator-title">' +
          colour_state +
          symbol +
          "</span>" +
          "  " +
          separatedLabel +
          "</div>";
        $operator[0].classList.remove("warning");
        content = "<div></div>";
      } else {
        // En el editor

        let spanElement = document.createElement("span");
        spanElement.classList.add("fas", "fa-exclamation-triangle", "yellow");

        if (document.opCurrentTitle !== undefined) {
          if (document.opCurrentTitle === "Unconnected Operator") {
            title =
              '<div class ="flowchart-operator-title" title="Unconnected Operator">' +
              `<div id="" class="inline">` +
              '<div class="inline">' +
              '<span class="fas fa-exclamation-triangle yellow">' +
              "</span>" +
              "</div>" +
              "</div>" +
              "  " +
              separatedLabel +
              "</div>";
            $operator[0].classList.add("warning");
          } else if (
            document.opCurrentTitle === "Missing Input" ||
            document.opCurrentTitle === "Incompatible input and output types"
          ) {
            title =
              '<div class ="flowchart-operator-title" title="Missing Input">' +
              `<div id="" class="span inline">` +
              '<div class="inline">' +
              '<span class="fas fa-exclamation-circle red">' +
              "</span>" +
              "</div>" +
              "</div>" +
              "  " +
              separatedLabel +
              "</div>";
          } else if (document.opCurrentTitle === "") {
            title =
              '<div class ="flowchart-operator-title" title="">' +
              `<div id="" class="span inline">` +
              '<div class="inline">' +
              "</div>" +
              "</div>" +
              "  " +
              separatedLabel +
              "</div>";
          }
        } else {
          title =
            '<div class ="flowchart-operator-title" title="">' +
            `<div id="" class="span inline">` +
            '<div class="inline">' +
            "</div>" +
            "</div>" +
            "  " +
            separatedLabel +
            "</div>";
        }
        content = "<div></div>";
      }
      var $operator_title = $(content);
      $operator_title.html(title);
      $operator_title.appendTo($operator);

      var $operator_inputs_outputs = $('<div class="flowchart-operator-inputs-outputs"></div>');
      $operator_inputs_outputs.appendTo($operator);
      var $operator_inputs = $('<span class="flowchart-operator-inputs"> </span>');
      $operator_inputs.appendTo($operator_inputs_outputs);
      var $operator_outputs = $('<span class="flowchart-operator-outputs"> </span>');
      $operator_outputs.appendTo($operator_inputs_outputs);

      var self = this;
      var connectorArrows = {};
      var connectorSmallArrows = {};
      var connectorSets = {};
      var connectors = {};

      var fullElement = {
        individual: infos.individual,
        description: infos.description,
        uri: infos.uri,
        operator: $operator,
        name: $operator_title,
        connectorSets: connectorSets,
        connectors: connectors,
        connectorArrows: connectorArrows,
        connectorSmallArrows: connectorSmallArrows,
      };

      function addConnector(connectorKey, connectorInfos, $operator_container, connectorType) {
        let $operator_connector_set = $('<div class="flowchart-operator-connector-set"> </div>');
        $operator_connector_set.data("connector_type", connectorType);

        if (connectorType === "inputs" && infos.inputs[connectorKey] !== undefined) {
          let inTypeChunks = infos.inputs[connectorKey].definition.uri.split("/");
          let inType = inTypeChunks[inTypeChunks.length - 1];
          $operator_connector_set.attr("title", "input type: " + inType);
        }
        if (connectorType === "outputs" && infos.outputs !== undefined && infos.outputs[connectorKey] !== undefined) {
          let outTypeChunks = infos.outputs[connectorKey].definition.uri.split("/");
          let outType = outTypeChunks[outTypeChunks.length - 1];
          $operator_connector_set.attr("title", "output type: " + outType);
        }

        $operator_connector_set.appendTo($operator_container);
        connectorArrows[connectorKey] = [];
        connectorSmallArrows[connectorKey] = [];
        connectors[connectorKey] = [];
        connectorSets[connectorKey] = $operator_connector_set;
        self._createSubConnector(connectorKey, connectorInfos, fullElement);
      }

      for (var key_i in infos.inputs) {
        if (infos.inputs.hasOwnProperty(key_i)) {
          addConnector(key_i, infos.inputs[key_i], $operator_inputs, "inputs");
        }
      }

      for (var key_o in infos.outputs) {
        if (infos.outputs.hasOwnProperty(key_o)) {
          addConnector(key_o, infos.outputs[key_o], $operator_outputs, "outputs");
        }
      }
      return fullElement;
    },

    _createSubConnector: function (connectorKey, connectorInfos, fullElement) {
      var $operator_connector_set = fullElement.connectorSets[connectorKey];

      var subConnector = fullElement.connectors[connectorKey].length;
      var $operator_connector = $('<div class="flowchart-operator-connector"></div>');
      $operator_connector.appendTo($operator_connector_set);
      $operator_connector.data("connector", connectorKey);
      $operator_connector.data("sub_connector", subConnector);
      var $operator_connector_label = $(
        '<div style="display:inline-block" onchange="updateTopicLabel()" class="flowchart-operator-connector-label"></div>'
      );

      if (connectorInfos.name !== undefined) {
        $operator_connector_label.text(connectorInfos.properties.label.replace("(:i)", subConnector + 1));
      } else {
        $operator_connector_label.text(connectorInfos.properties.label.replace("(:i)", subConnector + 1));
      }
      $operator_connector_label.appendTo($operator_connector);
      var $operator_connector_arrow = $('<div  class="flowchart-operator-connector-arrow"></div>');
      $operator_connector_arrow.appendTo($operator_connector);
      var $operator_connector_small_arrow = $('<div class="flowchart-operator-connector-small-arrow"></div>');
      $operator_connector_small_arrow.appendTo($operator_connector);

      fullElement.connectors[connectorKey].push($operator_connector);
      fullElement.connectorArrows[connectorKey].push($operator_connector_arrow);
      fullElement.connectorSmallArrows[connectorKey].push($operator_connector_small_arrow);
    },

    getOperatorElement: function (operatorData) {
      var fullElement = this._getOperatorFullElement(operatorData);
      return fullElement.operator;
    },

    addOperator: function (operatorData) {
      while (typeof this.data.operators[this.operatorNum] != "undefined") {
        this.operatorNum++;
      }

      this.createOperator(this.operatorNum, operatorData, undefined);
      return this.operatorNum;
    },

    createOperator: function (operatorId, operatorData, operatorStatus) {
      operatorData.internal = {};
      this._refreshInternalProperties(operatorData);
      var fullElement = this._getOperatorFullElement(operatorData, operatorStatus);
      let nbName = operatorData.properties.name;

      fullElement.operator.appendTo(this.objs.layers.operators);
      fullElement.operator.css({ top: operatorData.top, left: operatorData.left });
      fullElement.operator.data("operator_id", operatorId);

      var operatorCreated = this.objs.layers.operators[0].lastChild;
      operatorCreated.id = operatorId;

      this.data.operators[operatorId] = operatorData;
      this.data.operators[operatorId].internal.els = fullElement;

      if (operatorId === this.selectedOperatorId) {
        this._addSelectedClass(operatorId);
      }
      var self = this;

      function operatorChangedPosition(operator_id, pos) {
        operatorData.top = pos.top;
        operatorData.left = pos.left;

        for (var linkId in self.data.links) {
          if (self.data.links.hasOwnProperty(linkId)) {
            var linkData = self.data.links[linkId];
            if (linkData.fromOperator === operator_id || linkData.toOperator === operator_id) {
              self._refreshLinkPositions(linkId);
            }
          }
        }
      }

      if (this.options.canUserMoveOperators) {
        var pointerX;
        var pointerY;
        fullElement.operator.draggable({
          containment: operatorData.internal.properties.uncontained ? false : this.element,
          handle: ".flowchart-operator-title",
          start: function (e, ui) {
            if (self.lastOutputConnectorClicked != null) {
              e.preventDefault();
              return;
            }
            var elementOffset = self.element.offset();
            pointerX = (e.pageX - elementOffset.left) / self.positionRatio - parseInt($(e.target).css("left"));
            pointerY = (e.pageY - elementOffset.top) / self.positionRatio - parseInt($(e.target).css("top"));
          },
          drag: function (e, ui) {
            if (self.options.grid) {
              var grid = self.options.grid;
              var elementOffset = self.element.offset();
              ui.position.left =
                Math.round(((e.pageX - elementOffset.left) / self.positionRatio - pointerX) / grid) * grid;
              ui.position.top =
                Math.round(((e.pageY - elementOffset.top) / self.positionRatio - pointerY) / grid) * grid;

              if (!operatorData.internal.properties.uncontained) {
                var $this = $(this);
                ui.position.left = Math.min(Math.max(ui.position.left, 0), self.element.width() - $this.outerWidth());
                ui.position.top = Math.min(Math.max(ui.position.top, 0), self.element.height() - $this.outerHeight());
              }

              ui.offset.left = Math.round(ui.position.left + elementOffset.left);
              ui.offset.top = Math.round(ui.position.top + elementOffset.top);
              fullElement.operator.css({ left: ui.position.left, top: ui.position.top });
            }
            operatorChangedPosition($(this).data("operator_id"), ui.position);
          },
          stop: function (e, ui) {
            self._unsetTemporaryLink();
            var operatorId = $(this).data("operator_id");
            operatorChangedPosition(operatorId, ui.position);
            fullElement.operator.css({ height: "auto" });

            self.options.onOperatorMoved(operatorId, ui.position);
            self.options.onAfterChange("operator_moved");
          },
        });
      }

      function recallTitle(title) {
        if (title === "Unconnected Operator") {
          operatorCreated.firstChild.firstChild.innerHTML =
            `<div id="${spanId}" class="span inline">` +
            '<div class="inline">' +
            '<span class="fas fa-exclamation-triangle yellow">' +
            "</span>" +
            "</div>" +
            "</div>" +
            operatorData.properties.label;
          operatorCreated.firstChild.firstChild.title = "Unconnected Operator";
        } else if (title === "Missing Input" || title === "Incompatible input and output types") {
          operatorCreated.firstChild.firstChild.innerHTML =
            `<div id="${spanId}" class="span inline">` +
            '<div class="inline">' +
            '<span class="fas fa-exclamation-circle red">' +
            "</span>" +
            "</div>" +
            "</div>" +
            operatorData.properties.label;
          operatorCreated.firstChild.firstChild.title = title;
        } else if (title === "") {
          operatorCreated.firstChild.firstChild.innerHTML = operatorData.properties.label;
        }
      }

      let spanElement = document.createElement("span");
      spanElement.classList.add("fas", "fa-exclamation-triangle", "yellow");

      let createdOperator = document.getElementById(operatorId);
      let spanId = "span" + operatorId;

      if (operatorStatus === undefined && this.createOperator.caller.name === "setOperatorData") {
        // Called from Set Data
        recallTitle(document.opCurrentTitle);
      } else if (operatorStatus === undefined && this.createOperator.caller.name === "setData") {
        // Import
        recallTitle(createdOperator.firstChild.firstChild.title);
      } else if (operatorStatus === undefined) {
        let separatedLabel = operatorData.properties.label.replace(/((?<=[a-z])[A-Z]|[A-Z](?=[a-z]))/g, " $1").trim();
        operatorCreated.firstChild.firstChild.innerHTML =
          `<div id="${spanId}" class="span inline">` +
          '<div class="inline">' +
          '<span class="fas fa-exclamation-triangle yellow">' +
          "</span>" +
          "</div>" +
          "</div>" +
          " " +
          separatedLabel;
        operatorCreated.firstChild.firstChild.title = "Unconnected Operator";
      }

      document.createdOpId = operatorId;
      this.options.onAfterChange("operator_create");
    },

    _arrowClicked: function (operator, connector, subConnector, connectorCategory) {
      let _arrowClicked = this;
      if (connectorCategory === "outputs") {
        this.lastOutputConnectorClicked = {
          operator: operator,
          connector: connector,
          subConnector: subConnector,
        };
        this.objs.layers.temporaryLink.show();
        var position = this.getConnectorPosition(operator, connector, subConnector);
        var x = position.x + position.width;
        var y = position.y;
        this.objs.temporaryLink.setAttribute("x1", x.toString());
        this.objs.temporaryLink.setAttribute("y1", y.toString());

        document.getElementById("dash-animation").beginElement();
        this._mousemove(x, y);
      }
      if (connectorCategory === "inputs" && this.lastOutputConnectorClicked != null) {
        var linkData = {
          fromOperator: this.lastOutputConnectorClicked.operator,
          fromConnector: this.lastOutputConnectorClicked.connector,
          fromSubConnector: this.lastOutputConnectorClicked.subConnector,
          toOperator: operator,
          toConnector: connector,
          toSubConnector: subConnector,
        };

        let links = this.getData().links;
        async function checkExistingLink() {
          if (links[0] !== undefined) {
            let differentInputToAll = true;
            let differentLinkToAll = true;
            for (let link in links) {
              if (
                links[link].fromOperator === linkData.fromOperator &&
                links[link].fromConnector === linkData.fromConnector &&
                links[link].fromSubConnector === linkData.fromSubConnector &&
                links[link].toOperator === linkData.toOperator &&
                links[link].toConnector === linkData.toConnector &&
                links[link].toSubConnector === linkData.toSubConnector &&
                differentLinkToAll === true
              ) {
                alert("link already exists");
                _arrowClicked._unsetTemporaryLink();
                differentLinkToAll = false;
              } else if (
                links[link].toOperator === linkData.toOperator &&
                links[link].toConnector === linkData.toConnector &&
                links[link].toSubConnector === linkData.toSubConnector &&
                differentLinkToAll === true
              ) {
                alert("input already in use");
                differentInputToAll = false;
                _arrowClicked._unsetTemporaryLink();
              }
            }
            // Si no es igual que ningun link, no coincide con ninguna input, lo creo
            if (differentLinkToAll === true && differentInputToAll === true) {
              _arrowClicked.addLink(linkData);
            }
            _arrowClicked._unsetTemporaryLink();
          } else {
            _arrowClicked.addLink(linkData);
            _arrowClicked._unsetTemporaryLink();
          }
        }
        checkExistingLink();
      }
    },

    _unsetTemporaryLink: function () {
      this.lastOutputConnectorClicked = null;
      this.objs.layers.temporaryLink.hide();
    },

    _mousemove: function (x, y, e) {
      if (this.lastOutputConnectorClicked != null) {
        this.objs.temporaryLink.setAttribute("x2", x);
        this.objs.temporaryLink.setAttribute("y2", y);
      }
    },

    _click: function (x, y, e) {
      var $target = $(e.target);
      if ($target.closest(".flowchart-operator-connector").length === 0) {
        this._unsetTemporaryLink();
      }

      if ($target.closest(".flowchart-operator").length === 0) {
        this.unselectOperator();
      }

      if ($target.closest(".flowchart-link").length === 0) {
        this.unselectLink();
      }
    },

    _removeSelectedClassOperators: function () {
      this.objs.layers.operators.find(".flowchart-operator").removeClass("selected");
    },

    unselectOperator: function () {
      if (this.selectedOperatorId != null) {
        if (!this.options.onOperatorUnselect()) {
          return;
        }
        this._removeSelectedClassOperators();
        this.selectedOperatorId = null;
      }
    },

    _addSelectedClass: function (operatorId) {
      this.data.operators[operatorId].internal.els.operator.addClass("selected");
    },

    selectOperator: function (operatorId) {
      if (!this.options.onOperatorSelect(operatorId)) {
        this._removeSelectedClassOperators();
        this.selectedOperatorId = operatorId;
        this._addSelectedClass(operatorId);
        return;
      }
      this.unselectLink();
      this._removeSelectedClassOperators();
      this._addSelectedClass(operatorId);
      this.selectedOperatorId = operatorId;
      this._addHoverClassOperator(operatorId);
    },

    addClassOperator: function (operatorId, className) {
      this.data.operators[operatorId].internal.els.operator.addClass(className);
    },

    removeClassOperator: function (operatorId, className) {
      this.data.operators[operatorId].internal.els.operator.removeClass(className);
    },

    removeClassOperators: function (className) {
      this.objs.layers.operators.find(".flowchart-operator").removeClass(className);
    },

    _addHoverClassOperator: function (operatorId) {
      this.data.operators[operatorId].internal.els.operator.addClass("hover");
    },

    _removeHoverClassOperators: function () {
      this.objs.layers.operators.find(".flowchart-operator").removeClass("hover");
    },

    _operatorMouseOver: function (operatorId) {
      if (!this.options.onOperatorMouseOver(operatorId)) {
        return;
      }
      this._addHoverClassOperator(operatorId);
    },

    _operatorMouseOut: function (operatorId) {
      if (!this.options.onOperatorMouseOut(operatorId)) {
        return;
      }
      this._removeHoverClassOperators();
    },

    getSelectedOperatorId: function () {
      return this.selectedOperatorId;
    },

    getOperatorConnections: function () {
      return this.OperatorConnections;
    },

    getSelectedLinkId: function () {
      return this.selectedLinkId;
    },

    _shadeColor: function (color, percent) {
      var f = parseInt(color.slice(1), 16),
        t = percent < 0 ? 0 : 255,
        p = percent < 0 ? percent * -1 : percent,
        R = f >> 16,
        G = (f >> 8) & 0x00ff,
        B = f & 0x0000ff;
      return (
        "#" +
        (
          0x1000000 +
          (Math.round((t - R) * p) + R) * 0x10000 +
          (Math.round((t - G) * p) + G) * 0x100 +
          (Math.round((t - B) * p) + B)
        )
          .toString(16)
          .slice(1)
      );
    },

    colorizeLink: function (linkId, color) {
      var linkData = this.data.links[linkId];
      linkData.internal.els.path.setAttribute("stroke", color);
      linkData.internal.els.rect.setAttribute("fill", color);
      linkData.internal.els.fromSmallConnector.css("border-left-color", color);
      linkData.internal.els.toSmallConnector.css("border-left-color", color);
    },

    uncolorizeLink: function (linkId) {
      this.colorizeLink(linkId, this.getLinkMainColor(linkId));
    },

    _connecterMouseOver: function (linkId) {
      if (this.selectedLinkId !== linkId) {
        this.colorizeLink(linkId, this._shadeColor(this.getLinkMainColor(linkId), -0.4));
      }
    },

    _connecterMouseOut: function (linkId) {
      if (this.selectedLinkId !== linkId) {
        this.uncolorizeLink(linkId);
      }
    },

    unselectLink: function () {
      if (this.selectedLinkId != null) {
        if (!this.options.onLinkUnselect()) {
          return;
        }
        this.uncolorizeLink(this.selectedLinkId, this.options.defaultSelectedLinkColor);
        this.selectedLinkId = null;
      }
    },

    selectLink: function (linkId) {
      this.unselectLink();
      if (!this.options.onLinkSelect(linkId)) {
        return;
      }
      this.unselectOperator();
      this.selectedLinkId = linkId;
      this.colorizeLink(linkId, this.options.defaultSelectedLinkColor);
    },

    deleteOperator: function (operatorId) {
      this._deleteOperator(operatorId, false);
    },

    _deleteOperator: function (operatorId, replace) {
      if (!this.options.onOperatorDelete(operatorId, replace)) {
        return false;
      }
      if (!replace) {
        for (var linkId in this.data.links) {
          if (this.data.links.hasOwnProperty(linkId)) {
            var currentLink = this.data.links[linkId];
            if (currentLink.fromOperator === operatorId || currentLink.toOperator === operatorId) {
              this._deleteLink(linkId, true);
            }
          }
        }
      }
      if (!replace && operatorId === this.selectedOperatorId) {
        this.unselectOperator();
      }
      this.data.operators[operatorId].internal.els.operator.remove();
      delete this.data.operators[operatorId];

      this.options.onAfterChange("operator_delete");
    },

    deleteLink: function (linkId) {
      this._deleteLink(linkId, false);
    },

    _deleteLink: function (linkId, forced) {
      if (this.selectedLinkId === linkId) {
        this.unselectLink();
      }
      if (!this.options.onLinkDelete(linkId, forced)) {
        if (!forced) {
          return;
        }
      }
      this.colorizeLink(linkId, "transparent");
      var linkData = this.data.links[linkId];
      var fromOperator = linkData.fromOperator;
      var fromConnector = linkData.fromConnector;
      var toOperator = linkData.toOperator;
      var toConnector = linkData.toConnector;
      linkData.internal.els.overallGroup.remove();
      delete this.data.links[linkId];

      this._cleanMultipleConnectors(fromOperator, fromConnector, "from");
      this._cleanMultipleConnectors(toOperator, toConnector, "to");

      this.options.onAfterChange("link_delete");

      let fromOp = $("#" + fromOperator)[0];
      let toOp = $("#" + toOperator)[0];
      this.validateComponentConnections(fromOp, toOp, linkData);
    },

    _cleanMultipleConnectors: function (operator, connector, linkFromTo) {
      if (!this.data.operators[operator].properties[linkFromTo === "from" ? "outputs" : "inputs"][connector].multiple) {
        return;
      }

      var maxI = -1;
      var fromToOperator = linkFromTo + "Operator";
      var fromToConnector = linkFromTo + "Connector";
      var fromToSubConnector = linkFromTo + "SubConnector";
      var els = this.data.operators[operator].internal.els;
      var subConnectors = els.connectors[connector];
      var nbSubConnectors = subConnectors.length;

      for (var linkId in this.data.links) {
        if (this.data.links.hasOwnProperty(linkId)) {
          var linkData = this.data.links[linkId];
          if (linkData[fromToOperator] === operator && linkData[fromToConnector] === connector) {
            if (maxI < linkData[fromToSubConnector]) {
              maxI = linkData[fromToSubConnector];
            }
          }
        }
      }

      var nbToDelete = Math.min(nbSubConnectors - maxI - 2, nbSubConnectors - 1);
      for (var i = 0; i < nbToDelete; i++) {
        subConnectors[subConnectors.length - 1].remove();
        subConnectors.pop();
        els.connectorArrows[connector].pop();
        els.connectorSmallArrows[connector].pop();
      }
    },

    deleteSelected: function () {
      if (this.selectedLinkId != null) {
        this.deleteLink(this.selectedLinkId);
      }
      if (this.selectedOperatorId != null) {
        this.deleteOperator(this.selectedOperatorId);
      }
    },

    setPositionRatio: function (positionRatio) {
      this.positionRatio = positionRatio;
    },

    getPositionRatio: function () {
      return this.positionRatio;
    },

    getTicketId: function () {
      return $.extend(true, {}, this.ticketId); // layers
    },

    getData: function () {
      var keys = ["operators", "links"];
      var data = {};
      data.operators = $.extend(true, {}, this.data.operators);
      data.links = $.extend(true, {}, this.data.links);
      for (var keyI in keys) {
        if (keys.hasOwnProperty(keyI)) {
          var key = keys[keyI];
          for (var objId in data[key]) {
            if (data[key].hasOwnProperty(objId)) {
              delete data[key][objId].internal;
            }
          }
        }
      }
      data.operatorTypes = this.data.operatorTypes;
      return data;
    },

    setOperatorTitle: function (operatorId, title) {
      this.data.operators[operatorId].internal.els.name.html(title);
      if (typeof this.data.operators[operatorId].properties == "undefined") {
        this.data.operators[operatorId].properties = {};
      }
      this.data.operators[operatorId].properties.name = title;
      this._refreshInternalProperties(this.data.operators[operatorId]);
      this.options.onAfterChange("operator_title_change");
    },

    getOperatorTitle: function (operatorId) {
      return this.data.operators[operatorId].internal.properties.name;
    },

    getTicketInfo: function (ticketId) {},

    setOperatorData: function (operatorId, operatorData) {
      var infos = this.getOperatorCompleteData(operatorData);
      for (var linkId in this.data.links) {
        if (this.data.links.hasOwnProperty(linkId)) {
          var linkData = this.data.links[linkId];
          if (
            (linkData.fromOperator === operatorId && typeof infos.outputs[linkData.fromConnector] == "undefined") ||
            (linkData.toOperator === operatorId && typeof infos.inputs[linkData.toConnector] == "undefined")
          ) {
            this._deleteLink(linkId, true);
          }
        }
      }
      this._deleteOperator(operatorId, true);
      this.createOperator(operatorId, operatorData);
      this.redrawLinksLayer();

      this.options.onAfterChange("operator_data_change");
    },

    doesOperatorExists: function (operatorId) {
      return typeof this.data.operators[operatorId] != "undefined";
    },

    getOperatorData: function (operatorId) {
      var data = $.extend(true, {}, this.data.operators[operatorId]);
      delete data.internal;
      return data;
    },

    getOperatorFullProperties: function (operatorData) {
      if (typeof operatorData.type != "undefined") {
        var typeProperties = this.data.operatorTypes[operatorData.type];
        var operatorProperties = {};
        if (typeof operatorData.properties != "undefined") {
          operatorProperties = operatorData.properties;
        }
        return $.extend({}, typeProperties, operatorProperties);
      } else {
        return operatorData.properties;
      }
    },

    _refreshInternalProperties: function (operatorData) {
      operatorData.internal.properties = this.getOperatorFullProperties(operatorData);
    },
  });
});
