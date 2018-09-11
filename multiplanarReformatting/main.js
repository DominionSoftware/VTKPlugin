
// TODO why can't I load this?
//import {parentStyle} from "./mprStyles";

// Define with var here so that we can continuously reload this code after making
// modifications


var MultiplanarReformattingPlugin = class MultiplanarReformattingPlugin extends OHIF.plugins.ViewportPlugin {
    constructor(options = {}) {
        super("MultiplanarReformattingPlugin");

        this.description = "Multiplanar Reformatting OHIF Plugin";
        OHIF.plugins.VTKDataCache = OHIF.plugins.VTKDataCache || {};
        OHIF.plugins.VTKDataCache.imageDataCache = new Map;
    }

    setup() {
        console.warn(`${this.name}: Setup Complete`);
    }

    setupViewportText(divParentElement,viewDirection,displaySet){

        // TODO , why aren't style sheets loading?
        divParentElement.style.position = "relative";
        divParentElement.style.color = '#91b9cd';
        ///////// TOP LEFT
        const topLeftParent = document.createElement('div');
        topLeftParent.style.position="absolute";
        topLeftParent.style.top="10px";
        topLeftParent.id = viewDirection + "TopLeft";
        topLeftParent.style.left="10px";
        const PatientName = document.createElement('div');
        PatientName.id = 'PatientName';
        topLeftParent.appendChild(PatientName);
        const PatientId = document.createElement('div');
        divParentElement.appendChild(topLeftParent);
        PatientId.id = 'PatientId';
        topLeftParent.appendChild(PatientId);

        //////////// BOT LEFT
        divParentElement.appendChild(topLeftParent);
        const botLeftParent = document.createElement('div');
        botLeftParent.style.position="absolute";
        botLeftParent.style.bottom="10px";
        botLeftParent.style.left="10px";
        botLeftParent.id = viewDirection + "BottomLeft";
        const SeriesNumber = document.createElement('div');
        SeriesNumber.id = 'SeriesNumber';
        botLeftParent.appendChild(SeriesNumber);
        const SliceNumber = document.createElement('div');
        SliceNumber.id = 'SliceNumber';
        botLeftParent.appendChild(SliceNumber);
        const ColsRows = document.createElement('div');
        botLeftParent.appendChild(ColsRows);
        ColsRows.id = 'ColsRows';
        const SliceThickness = document.createElement('div');

        SliceThickness.id = 'SliceThickness';
        botLeftParent.appendChild(SliceThickness);
        const SeriesDescription = document.createElement('div');
        botLeftParent.appendChild(SeriesDescription);
        SeriesDescription.id = 'SeriesDescription';

        /////////// TOP RIGHT
        divParentElement.appendChild(botLeftParent);
        const topRightParent = document.createElement('div');
        topRightParent.style.position="absolute";
        topRightParent.style.top="10px";
        topRightParent.style.right="10px";
        topRightParent.id = viewDirection + "TopRight";
        const StudyDescription = document.createElement('div');
        StudyDescription.id = 'StudyDescription';
        topRightParent.appendChild(StudyDescription);
        const SeriesDate = document.createElement('div');
        topRightParent.appendChild(SeriesDate);
        SeriesDate.id = 'SeriesDate';

        divParentElement.appendChild(topRightParent);
        /////////// BOT RIGHT
        const botRightParent = document.createElement('div');
        botRightParent.style.position="absolute";
        botRightParent.style.bottom="10px";
        botRightParent.id = viewDirection + "BotRight";
        botRightParent.style.right="10px";
        const Compression = document.createElement('div');
        Compression.id = 'Compression';
        botRightParent.appendChild(Compression);
        const WindowLevel = document.createElement('div');
        botRightParent.appendChild(WindowLevel);
        divParentElement.appendChild(botRightParent);

        WindowLevel.id = 'WindowLevel';
    }
    setupViewport(div, viewportData, displaySet) {
        const divParentElement =  div.parentElement;
        const { viewportIndex } = viewportData;
        let { viewDirection } = viewportData.pluginData;

        console.warn(`${this.name}|setupViewport: viewportIndex: ${viewportIndex}`);

        if (!displaySet) {
            displaySet = OHIF.plugins.ViewportPlugin.getDisplaySet(viewportIndex);
        }

        const { VTKUtils } = window;
        const imageDataObject = VTKUtils.getImageData(displaySet);
        const imageData = imageDataObject.vtkImageData;

        div.innerHTML = '';


        const volumeViewer = vtk.Rendering.Misc.vtkGenericRenderWindow.newInstance({
            background: [0, 0, 0],
        });

        volumeViewer.setContainer(div);

        // TODO: VTK's canvas currently does not fill the viewport element
        // after it has been resized. We need to set the height to 100% and
        // trigger volumeViewer.resize() whenever things are resized.
        // We might need to find a way to hook onto the OHIF Viewer ResizeManager
        // div.querySelector('canvas').style.height = '100%';
        volumeViewer.resize();

        const actor = MultiplanarReformattingPlugin.setupVTKActor(imageData);
        const renderer = volumeViewer.getRenderer();
        const renderWindow = volumeViewer.getRenderWindow();

        renderer.addActor(actor);

        const scanDirection = imageDataObject.orientation;
        if (!viewDirection) {
            console.warn('No View Direction provided!');
            viewDirection = scanDirection;
        }


        this.setupViewportText(divParentElement,viewDirection,displaySet);


        const { MPR, ohifInteractorStyleSlice } = VTKUtils;
        const imageMapper = actor.getMapper();
        const mode = MPR.computeSlicingMode(scanDirection, viewDirection);

        console.warn(imageData);
        imageMapper.setInputData(imageData);
        imageMapper.setSlicingMode(mode);

        const IPP = MPR.computeIPP(imageDataObject);
        const interactorStyle = ohifInteractorStyleSlice.newInstance();
        console.assert(imageDataObject.dimensions[0] > 0);
        console.assert(imageDataObject.dimensions[1] > 0);
        console.assert(imageDataObject.dimensions[2] > 0);
        const cx = Math.floor((imageDataObject.dimensions[0] - 1) / 2);
        const cy = Math.floor((imageDataObject.dimensions[1] - 1) / 2);
        const cz = Math.floor((imageDataObject.dimensions[2] - 1) / 2);
        const initialValues = {
            // zero based indexing;
            currentXIndex: cx,
            currentYIndex: cy,
            currentZIndex: cz,
            xPositions: IPP.x,
            yPositions: IPP.y,
            zPositions: IPP.z,
            xSpacing: imageDataObject.spacing[0],
            ySpacing: imageDataObject.spacing[1],
            zSpacing: imageDataObject.spacing[2]
        }

        console.warn('initialValues', initialValues);

        interactorStyle.setDirectionalProperties(initialValues);
        interactorStyle.setInteractionMode('IMAGE_SLICE');
        interactorStyle.setViewDirection(viewDirection);
        interactorStyle.setDisplaySet(displaySet);
        renderWindow.getInteractor().setInteractorStyle(interactorStyle);

        console.warn(`scanDirection: ${scanDirection}`);
        console.warn(`viewDirection: ${viewDirection}`);
        // TODO trying to force update hear.
        interactorStyle.handleStartMouseWheel();
        interactorStyle.moveSliceByWheel(0);
        interactorStyle.handleEndMouseWheel();


        MPR.computeCamera(scanDirection, viewDirection, renderer.getActiveCamera());

        renderer.resetCameraClippingRange();
        renderer.resetCamera();
        renderWindow.render();

    }

    static setupVTKActor(imageData) {
        const mapper = vtk.Rendering.Core.vtkImageMapper.newInstance();
        mapper.setInputData(imageData);

        const actor = vtk.Rendering.Core.vtkImageSlice.newInstance();
        actor.setMapper(mapper);

        return actor;
    }
}

OHIF.plugins.entryPoints["MultiplanarReformattingPlugin"] = function () {
    const multiplanarReformattingPlugin = new MultiplanarReformattingPlugin();
    multiplanarReformattingPlugin.setup();

    OHIF.plugins.MultiplanarReformattingPlugin = multiplanarReformattingPlugin;
};

