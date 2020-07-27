//Title: WebViewer React Component
//Author: William Lasater
// Date: 21 July 2020

//notes: This component can take a lot of modulations but I put eveything in one file for proof of concept
//       I propably used too many sates and refs as I was learning their meaning as I went. throw them out as needed.

import React, {useEffect, useRef, useState} from 'react';
import WebViewer from '@pdftron/webviewer';
import axios from 'axios';
import DropSignature from './dropSignature.js'

const PDFViewerWindow = (props)=>
{
  const selectedFile = useRef(null);
  const [filesList, setFilesList] = useState([]);
  const [currentFile, setCurrentFile] = useState("no File Name");
  const viewer = useRef(null);
  const [instance, setInstance] = useState(null);
  const [annotManager, setAnnotManager] = useState(null);
  let WebViewerLoaded = useRef(false);
  var fileName = "";
	const signatureTool = useRef(null);

  useEffect(() => {
    if(!WebViewerLoaded.current)
    {
      updateList();
      //this init the WebViewer with a set of settings
      WebViewer(
        {
          path: '/pdfviewer',
          annotationUser:'William L.',
          //More settings can be placed here
        },
        viewer.current,
      ).then((instance) => {

          //Change/remove visual components of the WebViewer here and assign managers here

          let {annotManager, Tools} = instance;
          setInstance(instance);
          WebViewerLoaded.current = true;

          //add save button to WebViewer and listener
          instance.setHeaderItems(function(header) {
            header.push({
              type: 'actionButton',
              img: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none"/><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>',
              onClick: function() {
                // Save annotations when button is clicked
								//switch signature annotation with real ones
								signatureTool.current.switchSignatures();
                /*annotManager.exportAnnotations({ links: true, widgets: true, fields: true }).then(function(xfdfString) {
                  saveXfdfString(fileName, xfdfString).then(function() {
                    console.log("File was successfuly saved!");
                  });
                });*/
              }
            });
						header.push({
              type: 'customElement',
              render: ()=>{return(<DropSignature instance={instance} ref={signatureTool}/>)}
            });
          });
          //lead annotation of Doc when loaded
          instance.docViewer.on('documentLoaded', function() {
            loadXfdfString(fileName).then(function(xfdfString) {
              annotManager.importAnnotations(xfdfString).then(function(annotations) {
                annotManager.drawAnnotationsFromList(annotations);
              });
            });
          });
        });
    }
    else
    {
      instance.loadDocument("/files/"+currentFile);
    }
  }, [currentFile]);

  //load list of files present in server files folder
  const updateList = ()=>{
    axios.get("http://localhost:8000/pdfs").then((res) => {
      let array = []
      res.data.forEach((file, i) => {
        array.push(<li onClick={changeDocument} style={{cursor:"pointer"}}>{res.data[i]}</li>);
      });
      setFilesList(array);
    });
  };

  //promise for loading annotation
  const loadXfdfString = function(documentName) {
    return new Promise(function(resolve) {
      fetch(`http://localhost:8000/loadDoc?documentName=${documentName}`,{
        method:'GET'
      }).then(function(response) {
        if (response.status === 200) {
          response.text().then((xfdfString)=>{
            resolve(xfdfString);
          });
        }
      });
    });
  };

  //promise to save annoations
  const saveXfdfString = function(documentName, xfdfString) {
    return new Promise(function(resolve) {
      axios.post(`http://localhost:8000/save?documentName=${documentName}`, {data:xfdfString}).then(function(response) {
        if (response.status === 200) {
          resolve();
        }
      });
    });
  };

  const fileSelected = (e)=>{
    selectedFile.current = e.target.files[0];
  }

  const onUpload = ()=>{
    const data = new FormData();
    data.append('file', selectedFile.current);
    console.log(selectedFile.current);
    axios.post("http://localhost:8000/upload", data, {
    }).then(res => {
        setCurrentFile(selectedFile.current.name);
        updateList();
    })
  }

  //listed Doc click, change Doc view
  const changeDocument = (e)=>{
    setCurrentFile(e.target.innerHTML);
    //loadDocument(e.target.innerHTML);
    fileName = e.target.innerHTML;
  }

  const saveFile = ()=>{
    annotManager.exportAnnotations({}).then((xfdfString)=>{
        saveXfdfString(currentFile,xfdfString);
    })
  }

  //css stuff
  const controlStyles = {
    position:"absolute",
    left:"0px",
    top:"0px",
    height:"100%",
    width:"22%",
  };

  let viewerStyles={
    position:"absolute",
    top:0,
    right:0,
    width:"77%",
    height:"100%",
  }

  return(
    <div>
      <div style={controlStyles}>
        <input type="file" name="file" onChange={fileSelected}/>
        <button onClick={onUpload}>Upload</button>
        <ul>{filesList}</ul>
      </div>
      <div ref={viewer} style={viewerStyles}></div>
    </div>
  );
};
export default PDFViewerWindow;
