import React, {useEffect, useRef, useState} from 'react';
import axios from 'axios';

class DropSignature extends React.Component
{

	constructor(props)
	{
		super(props);
		this.DocInstance = props.instance;
		this.addField = this.addField.bind(this);
	}

	addField(type, point = {}, name = '', value = '', flag = {})
	{
    const { docViewer, Annotations } = this.DocInstance;
    const annotManager = docViewer.getAnnotationManager();
    const doc = docViewer.getDocument();
    const displayMode = docViewer.getDisplayModeManager().getDisplayMode();
    const page = displayMode.getSelectedPages(point, point);
    if (!!point.x && page.first == null) {
      return; //don't add field to an invalid page location
    }
    const page_idx =
      page.first !== null ? page.first : docViewer.getCurrentPage() - 1;
    const page_info = doc.getPageInfo(page_idx);
    const page_point = displayMode.windowToPage(point, page_idx);
    const zoom = docViewer.getZoom();

    var textAnnot = new Annotations.FreeTextAnnotation();
    textAnnot.PageNumber = page_idx + 1;
    const rotation = docViewer.getCompleteRotation(page_idx + 1) * 90;
    textAnnot.Rotation = rotation;
    if (rotation === 270 || rotation === 90) {
      textAnnot.Width = 50.0 / zoom;
      textAnnot.Height = 250.0 / zoom;
    } else {
      textAnnot.Width = 250.0 / zoom;
      textAnnot.Height = 50.0 / zoom;
    }
    textAnnot.X = (page_point.x || page_info.width / 2) - textAnnot.Width / 2;
    textAnnot.Y = (page_point.y || page_info.height / 2) - textAnnot.Height / 2;

    textAnnot.setPadding(new Annotations.Rect(0, 0, 0, 0));
    textAnnot.custom = {
      type,
      value,
      flag,
      name: `Client Signature Here.`,
    };

    // set the type of annot
    textAnnot.setContents(textAnnot.custom.name);
    textAnnot.FontSize = '' + 20.0 / zoom + 'px';
    textAnnot.FillColor = new Annotations.Color(211, 211, 211, 0.5);
    textAnnot.TextColor = new Annotations.Color(0, 165, 228);
    textAnnot.StrokeThickness = 1;
    textAnnot.StrokeColor = new Annotations.Color(0, 165, 228);
    textAnnot.TextAlign = 'center';

    textAnnot.Author = annotManager.getCurrentUser();

    annotManager.deselectAllAnnotations();
    annotManager.addAnnotation(textAnnot, true);
    annotManager.redrawAnnotation(textAnnot);
    annotManager.selectAnnotation(textAnnot);
  };

	async switchSignatures()
	{
		const { Annotations, docViewer } = this.DocInstance;
    const annotManager = docViewer.getAnnotationManager();
    const fieldManager = annotManager.getFieldManager();
    const annotationsList = annotManager.getAnnotationsList();
    const annotsToDelete = [];
    const annotsToDraw = [];

		await Promise.all(annotationsList.map(async (annot, index)=>{
			let builtAnnotation = null;
			if(typeof annot.custom !== 'undefined')
			{
				if(annot.custom.type === 'SIGNATURE')
				{
					console.log("oh look a signature");
					let flags = new Annotations.WidgetFlags();

					builtAnnotation = new Annotations.SignatureWidgetAnnotation(
						new Annotations.Forms.Field('ClientSig',{
							type:'Sig',
							flags,
						})
						,{
						appearance: '_DEFAULT',
						appearances: {
							_DEFAULT: {
								Normal: {
									data:
										'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAYdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjEuMWMqnEsAAAANSURBVBhXY/j//z8DAAj8Av6IXwbgAAAAAElFTkSuQmCC',
									offset: {
										x: 100,
										y: 100,
									},
								},
							},
						},
					})
				}
			}
			else
			{
				return;
			}

			builtAnnotation.PageNumber = annot.getPageNumber();
			builtAnnotation.X = annot.getX();
			builtAnnotation.Y = annot.getY();
			builtAnnotation.rotation = annot.Rotation;
			if (annot.Rotation === 0 || annot.Rotation === 180) {
				builtAnnotation.Width = annot.getWidth();
				builtAnnotation.Height = annot.getHeight();
			} else {
				builtAnnotation.Width = annot.getHeight();
				builtAnnotation.Height = annot.getWidth();
			}
			annotsToDelete.push(annot);

			annotManager.addAnnotation(builtAnnotation);
			annotsToDraw.push(builtAnnotation);
		}))
		// delete old annotations
    annotManager.deleteAnnotations(annotsToDelete, null, true);
    // refresh viewer
    annotManager.drawAnnotationsFromList(annotsToDraw);
		this.saveEmbededPDF();
	}

	async saveEmbededPDF()
	{
		console.log("going to try and save PDF now.");
		let {docViewer, annotManager, Annotations} = this.DocInstance;
		const xfdfString = await annotManager.exportAnnotations({widgets:true, fields:true});
		console.log(xfdfString);
		const doc =  docViewer.getDocument();
    const data = await doc.getFileData({xfdfString});
  	const arr = new Uint8Array(data);
  	const file = new File([arr], "thisIsAFile.pdf", {type: 'application/pdf'});
		const signdata = new FormData();
		signdata.append('file', file);
  	axios.post('http://localhost:8000/upload',signdata)
		.then(()=>{
			console.log("done saving pdf");
		});
	}

	onDragStart(e)
	{
		e.target.style.opacity = 0.5;
    const copy = e.target.cloneNode(true);
    copy.id = 'form-build-drag-image-copy';
    copy.style.width = '250px';
    document.body.appendChild(copy);
    e.dataTransfer.setDragImage(copy, 125, 25);
    e.dataTransfer.setData('text', '');
	}

	onDragEnd(e)
	{
		this.addField('SIGNATURE', e);
    e.target.style.opacity = 1;
    document.body.removeChild(
      document.getElementById('form-build-drag-image-copy'),
    );
    e.preventDefault();
	}
	render()
	{
		let styles = {
			position:'relative',
			display: 'flex',
			height: 46,
			justifyContent: 'center',
			alignItems: 'center',
			paddingLeft:5,
			paddingRight:5,
			cursor: 'pointer'
		}

		return(
			<div
			draggable
			onDragStart={e=>{this.onDragStart(e)}}
			onDragEnd={e=>{this.onDragEnd(e)}}
			style={styles}>
			Add Signature
			</div>
		)
	}
}
export default DropSignature;
