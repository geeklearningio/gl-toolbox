﻿// list of assets to generate
var assets = [
    { "name": "screen-hdpi-landscape", "width": 800, "height": 480, "target": "android", options: { "ninePatch": true } },
    { "name": "screen-ldpi-landscape", "width": 320, "height": 200, "target": "android", options: { "ninePatch": true } },
    { "name": "screen-mdpi-landscape", "width": 480, "height": 320, "target": "android", options: { "ninePatch": true } },
    { "name": "screen-xhdpi-landscape", "width": 1280, "height": 720, "target": "android", options: { "ninePatch": true } },
    { "name": "screen-xxhdpi-landscape", "width": 1600, "height": 1900, "target": "android", options: { "ninePatch": true } },
    { "name": "screen-xxxhdpi-landscape", "width": 1280, "height": 720, "target": "android", options: { "ninePatch": true } },
    { "name": "screen-hdpi-portrait", "width": 480, "height": 800, "target": "android", options: { "ninePatch": true } },
    { "name": "screen-ldpi-portrait", "width": 300, "height": 320, "target": "android", options: { "ninePatch": true } },
    { "name": "screen-mdpi-portrait", "width": 320, "height": 480, "target": "android", options: { "ninePatch": true } },
    { "name": "screen-xhdpi-portrait", "width": 720, "height": 1280, "target": "android", options: { "ninePatch": true } },
    { "name": "screen-xxhdpi-portrait", "width": 1600, "height": 1900, "target": "android", options: { "ninePatch": true } },
    { "name": "screen-xxxhdpi-portrait", "width": 720, "height": 1280, "target": "android", options: { "ninePatch": true } },

    { "name": "screen-ipad-portrait", "width": 768, "height": 1024, "target": "ios" },
    { "name": "screen-ipad-portrait-2x", "width": 1536, "height": 2048, "target": "ios" },
    { "name": "screen-iphone-portrait", "width": 320, "height": 480, "target": "ios" },
    { "name": "screen-iphone-portrait-2x", "width": 640, "height": 960, "target": "ios" },
    { "name": "screen-iphone-portrait-568h", "width": 640, "height": 1136, "target": "ios" },
    { "name": "screen-iphone-portrait-667h", "width": 750, "height": 1334, "target": "ios" },
    { "name": "screen-iphone-portrait-736h", "width": 1242, "height": 2208, "target": "ios" },
    { "name": "screen-ipad-landscape", "width": 1024, "height": 768, "target": "ios" },
    { "name": "screen-ipad-landscape-2x", "width": 2048, "height": 1536, "target": "ios" },
    { "name": "screen-iphone-landscape", "width": 480, "height": 320, "target": "ios" },
    { "name": "screen-iphone-landscape-2x", "width": 960, "height": 640, "target": "ios" },
    { "name": "screen-iphone-landscape-568h", "width": 1136, "height": 640, "target": "ios" },
    { "name": "screen-iphone-landscape-667h", "width": 1334, "height": 750, "target": "ios" },
    { "name": "screen-iphone-landscape-736h", "width": 2208, "height": 1242, "target": "ios" },
];

// entry point
function main() {

    var saveForWeb = new ExportOptionsSaveForWeb();
    saveForWeb.format = SaveDocumentType.PNG;
    saveForWeb.PNG8 = false;
    saveForWeb.transparency = true;
    saveForWeb.quality = 100;
    var doc;
    var wasOpen = false;
    
    if (!app.documents.length) {
        var sourceFile = File.openDialog("Select a 1:1 sqaure PNG file that is at least 1024x1024.", "*.psd", false);
        if (sourceFile == null) {
            return;
        }
        doc = open(new File(sourceFile), OpenDocumentType.PHOTOSHOP);
        if (doc == null) {
            alert("Oh shit!\nSomething is wrong with the file. Make sure it is a valid PSD file.");
            return;
        }
    } else {
        doc = app.activeDocument;
        wasOpen = true;
    }

    var destFolder = Folder.selectDialog("Choose an output folder.\n*** Warning! ***\nThis will overwrite any existing files with the same name in this folder.");
    if (destFolder == null) {
        return;
    }

    var docName = doc.name;


    var actions = [];
    var variantGroups = [];

// analyzing layers, extracting modifier actions and variants
    visitLayers(doc.layers, function (layer) {
        if (layer.name) {
            var nameParts = layer.name.split("_");
            if (nameParts.length) {
                var modifierCandidate = nameParts[nameParts.length - 1];
                if (modifierCandidate.lastIndexOf('mod-', 0) === 0) {
                    var modifierActions = modifierCandidate.split('-');
                    for (var index = 1; index < modifierActions.length; index++) {
                        var action = modifierActions[index].split(':');
                        actions.push({
                            mod: mods[action[0]],
                            params: action.length > 1 ? action[1].split(',') : [],
                            layer: layer.name,
                            layerDetails: {
                                top: layer.bounds[1].as('px'),
                                bottom: layer.bounds[3].as('px'),
                                bottomDist: doc.height.as('px') - layer.bounds[3].as('px'),
                                left: layer.bounds[0].as('px'),
                                right: layer.bounds[2].as('px'),
                                rightDist: doc.width.as('px') - layer.bounds[2].as('px'),
                                width: layer.bounds[2].as('px') - layer.bounds[0].as('px'),
                                height: layer.bounds[3].as('px') - layer.bounds[1].as('px')
                            }
                        })
                    }
                }

                if (nameParts[0].lastIndexOf('variant:', 0) === 0) {
                    var variantParts = nameParts[0].split(':')[1].split(',');
                    var variantGroup = { name: variantParts[0], order: parseInt(variantParts[1]), variants: [], layerName: layer.name };
                    for (var index = 0; index < layer.layers.length; index++) {
                        var element = layer.layers[index];
                        variantGroup.variants.push(element.name);
                    }
                    variantGroups.push(variantGroup);
                }
            }
        }
    });

// sorting variants by priority
    variantGroups.sort(function (a, b) { return a.order - b.order });

// computing cartesian product of all variants
    var allVariants = cross(variantGroups, function (v) { return v.variants });

    for (var i = 0; i < allVariants.length; i++) {
        var variant = allVariants[i];
        var variantDir = new Folder(destFolder + "/" + variant.join('/'));
        if (!variantDir.exists) {
            variantDir.create();
        }
        variant.dir = variantDir;
    }

// determining source aspect Ratio
    var sourceRatio = doc.width.as("px") / doc.height.as("px");

// initializing progress window
    var win = new Window("window{text:'Progress',bounds:[100,100,400,150],bar:Progressbar{bounds:[20,20,280,31] , value:0,maxvalue:100}};");
    win.show();
    var total = assets.length * allVariants.length;
    var current = 0;

    for (var i = 0; i < assets.length; i++) {
        var asset = assets[i];
        var options = asset.options ? asset.options : {};
        options[asset.target] = true;

// duplicate and resize doc
        var newDoc = doc.duplicate(asset.name);
        var resizeHeight = options.ninePatch ? asset.height - 2 : asset.height
        newDoc.resizeImage(new UnitValue(sourceRatio * resizeHeight, "px"), new UnitValue(resizeHeight, "px"), null, ResampleMethod.BICUBICSHARPER);
        newDoc.resizeCanvas(new UnitValue(asset.width, "px"), new UnitValue(asset.height, "px"), AnchorPosition.MIDDLECENTER);

//apply modifier actions
        for (var index = 0; index < actions.length; index++) {
            var action = actions[index];
            action.mod(newDoc, findLayer(newDoc.layers, action.layer), action.params, { asset: asset, options: options, layerDetails: action.layerDetails, appliedRatio: asset.height / doc.height.as("px") });
        }

// for each variant
        for (var j = 0; j < allVariants.length; j++) {
            var variant = allVariants[j];
            var outputDir = new Folder(variant.dir + "/screens/" + asset.target);
            if (!outputDir.exists) {
                outputDir.create();
            }

// show the right variant layers
            for (var g = 0; g < variant.length; g++) {
                var group = variant[g];
                var groupLayer = findLayer(newDoc.layers, group.group.layerName);
                for (var v = 0; v < groupLayer.layers.length; v++) {
                    var variantLayer = groupLayer.layers[v];
                    variantLayer.visible = variantLayer.name == group.selected;

                }
            }

// export document
            newDoc.exportDocument(new File(outputDir.fullName + "/" + asset.name + (options.ninePatch ? ".9" : "") + ".png"), ExportType.SAVEFORWEB, saveForWeb);

// updating progress
            win.bar.value = (100 * ++current) / total;
            win.text = 'Progress : ' + current + '/' + total;
        }

// releasing resources 
        

            newDoc.close(SaveOptions.DONOTSAVECHANGES);
            app.activeDocument = doc;
      
    }
    
// closing source document
    if (wasOpen) {
        
    } else {
        doc.close(SaveOptions.DONOTSAVECHANGES);
    }
    win.close();
}

// modifier defitions
var mods = {
    stretch: function (doc, layer, params, context) {
        for (var index = 0; index < params.length; index++) {
            var param = params[index];
            var layerWidth = layer.bounds[2].as('px') - layer.bounds[0].as('px');
            var layerHeight = layer.bounds[3].as('px') - layer.bounds[1].as('px');
            var margin = context.options.ninePatch ? 2 : 0;
            if (param === "x") {
                layer.resize((100 * (context.asset.width - margin)) / layerWidth, 100, AnchorPosition.MIDDLECENTER)
            }
            if (param === "y") {
                layer.resize(100, 100 * (context.asset.height - margin) / layerHeight, AnchorPosition.MIDDLECENTER)
            }
        }
    },
    vis: function (doc, layer, params, context) {
        if (context.options[params[0]]) {
            layer.visible = true;
        } else {
            layer.visible = false;
        }
    },
    dock: function (doc, layer, params, context) {
        doc.activeLayer = layer;
        var layerWidth = layer.bounds[2].as('px') - layer.bounds[0].as('px');
        var layerHeight = layer.bounds[3].as('px') - layer.bounds[1].as('px');
        for (var index = 0; index < params.length; index++) {
            var param = params[index];
            if (param === "right") {
                arrangeShape(doc.width.as('px') - layerWidth - context.layerDetails.rightDist, layer.bounds[1].as('px'), layerWidth, layerHeight)
            }
            if (param === "left") {
                arrangeShape(context.layerDetails.left, layer.bounds[1].as('px'), layerWidth, layerHeight)
            }
            if (param === "top") {
                arrangeShape(layer.bounds[0].as('px'), context.layerDetails.top, layerWidth, layerHeight)
            }
            if (param === "bottom") {
                arrangeShape(doc.height.as('px') - layerHeight - context.layerDetails.bottomDist, layer.bounds[1].as('px'), layerWidth, layerHeight)
            }
        }
    },
    scale: function (doc, layer, params, context) {
        var layerWidth = layer.bounds[2].as('mm') - layer.bounds[0].as('mm');
        var layerHeight = layer.bounds[3].as('mm') - layer.bounds[1].as('mm');
        for (var index = 0; index < params.length; index++) {
            var param = params[index];
            if (param === "reset") {
                layer.resize(100 * new UnitValue(context.layerDetails.width, 'px').as('mm') / layerWidth, 100 * new UnitValue(context.layerDetails.height, 'px').as('mm') / layerHeight, AnchorPosition.MIDDLECENTER)
            }
            if (param === "restore") {
                doc.activeLayer = layer;
                arrangeShape(layer.bounds[0].as('px'), layer.bounds[1].as('px'), context.layerDetails.width, context.layerDetails.height)
            }
            if (param === "restorex") {
                doc.activeLayer = layer;
                arrangeShape(layer.bounds[0].as('px'), layer.bounds[1].as('px'), context.layerDetails.width, layerHeight)
            }
            if (param === "restorey") {
                doc.activeLayer = layer;
                arrangeShape(layer.bounds[0].as('px'), layer.bounds[1].as('px'), layerWidth, context.layerDetails.height)
            }
        }
    }
};


// visit all layers in the document.
function visitLayers(layerSet, callback) {
    var result;
    for (var index = 0; index < layerSet.length; index++) {
        var layer = layerSet[index];
        var callResult = callback(layer);
        if (callResult) {
            result = callResult;
        }
        if (layer.layers) {
            callResult = visitLayers(layer.layers, callback);
            if (callResult) {
                result = callResult;
            }
        }
    }
    return result;
}

// finds the first layer with specified name
function findLayer(layerSet, name) {
    return visitLayers(layerSet, function (layer) {
        if (layer.name === name) {
            return layer;
        }
    });
}

// computes cartesian product of arrays
function cross(array, selector) {
    var acc = [];
    crossCore(array, [], selector, function (item) { acc.push(item) });
    return acc;
}

function crossCore(array, acc, selector, callback) {
    if (array && array.length) {
        var children = selector(array[0]);
        for (var index = 0; index < children.length; index++) {
            var child = children[index];
            var childAcc = acc ? acc.slice(0) : [];
            childAcc.push({ selected: child, group: array[0], toString: crossedToString });
            crossCore(array.slice(1), childAcc, selector, callback);
        }
    } else {
        callback(acc);
    }
}

function crossedToString() {
    return this.selected.toString();
}

// arranges a shape (quite unreadable but is more accurate than old api)
function arrangeShape(x, y, width, height) {
    var idchangePathDetails = stringIDToTypeID("changePathDetails");
    var desc15 = new ActionDescriptor();
    var idkeyOriginType = stringIDToTypeID("keyOriginType");
    desc15.putInteger(idkeyOriginType, 2);
    var idkeyOriginShapeBBox = stringIDToTypeID("keyOriginShapeBBox");
    var desc16 = new ActionDescriptor();
    var idunitValueQuadVersion = stringIDToTypeID("unitValueQuadVersion");
    desc16.putInteger(idunitValueQuadVersion, 1);
    var idTop = charIDToTypeID("Top ");
    var idPxl = charIDToTypeID("#Pxl");
    desc16.putUnitDouble(idTop, idPxl, y);
    var idLeft = charIDToTypeID("Left");
    var idPxl = charIDToTypeID("#Pxl");
    desc16.putUnitDouble(idLeft, idPxl, x);
    var idBtom = charIDToTypeID("Btom");
    var idPxl = charIDToTypeID("#Pxl");
    desc16.putUnitDouble(idBtom, idPxl, y + height);
    var idRght = charIDToTypeID("Rght");
    var idPxl = charIDToTypeID("#Pxl");
    desc16.putUnitDouble(idRght, idPxl, x + width);
    var idunitRect = stringIDToTypeID("unitRect");
    desc15.putObject(idkeyOriginShapeBBox, idunitRect, desc16);
    var idkeyActionPreserveLocation = stringIDToTypeID("keyActionPreserveLocation");
    desc15.putBoolean(idkeyActionPreserveLocation, false);
    executeAction(idchangePathDetails, desc15, DialogModes.NO);
}

// calling entry point
main();
