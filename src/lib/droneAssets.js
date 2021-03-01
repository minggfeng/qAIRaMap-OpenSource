import { infoWindowT} from './infowindow.js';
import { lastStartFlight, getInFlightSensor, noParametersRequest } from '../requests/get.js';
import { toast } from '../lib/helpers.js';
import { intervalToDuration } from 'date-fns';
import {socket} from '../index.js';

let flag = false;

const CallOnceToast = (flag0, value) => {
  if (!flag0) {
    flag=!flag0;
    toast(`The value ${value} is out of range`,'grey darken-1 rounded')
  }
}

const limitColor = (value,low,moderate,high) => {
  switch (true) {
    case (value>=0&&value<=low): return '#009966';
    case (value>low&&value<=moderate): return '#ffde33';
    case (value>moderate&&value<=high): return '#ff9933';
    case (value>high): return '#cc0033';
    case (value<0): CallOnceToast(flag,value)
    default: return'#FFFFFF'
  }
}
const circleColor = (params) => {
  switch (params.sensor) {
    case 'CO':return limitColor(params['CO'],50,100,150)
    case 'O3':return limitColor(params['O3'],50,100,150)
    case 'SO2':return limitColor(params['SO2'],50,100,150)
    case 'H2S':return limitColor(params['H2S'],50,100,150)
    case 'NO2':return limitColor(params['NO2'],50,100,150)
    case 'PM10':return limitColor(params['PM10'],50,100,150)
    case 'PM25':return limitColor(params['PM25'],50,100,150)
    default: return'#FFFFFF'
  }
}

export const addLine = (polyline,map) => {
  polyline.setMap(map);
}

export const removeLine = (polyline) => {
  polyline.setMap(null);  
}


let latlngLine = {};

const createOption = async (selection)=>{
  selection.innerHTML='<option value="" disabled selected>Andean Drone</option>'
  await noParametersRequest('flight_log_info_during_flight')
  .then(e=>e.forEach(drone=>{
    const option = document.createElement('option');
    option.setAttribute('value', drone.name);
    option.innerText =	drone.name+' :'+drone.comercial_name ;
    selection.appendChild(option);
  }))
  .catch(e=>null)
}

export let circlesArray = [];

export const newCircle = (center,map)=> {
  const pollutantCircle = new google.maps.Circle({
    strokeColor: circleColor(center),
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: circleColor(center),
    fillOpacity: 0.35,
    map,
    center: center.center,
    radius: 20,
  });
circlesArray.push(pollutantCircle)
}

const callSocketSensors = (params, map) =>  {
  
  socket.on(`${params.name}_${params.sensor}_processed`, async data => {
    await noParametersRequest('flight_log_info_during_flight')
      .then(e=>e.forEach(drone=>{
        if (params.sensor===data.sensor && drone.name===params.name) return newCircle(data,map)
        
      }))
      .catch(e=>null)
    
  })
  
}

const drawCirclesPollutant = async(params,map)=> {
 const data = await getInFlightSensor(params)
if(data.length>0){
  const center = data.reduce((acc,el,i)=>({
    ...acc,
    [i]:{'center':{'lat':el.lat,'lng':el.lon},[params.sensor]:el.pollutant,'sensor':params.sensor}
   }),[])
   Object.values(center).forEach(c=>newCircle(c,map))
  callSocketSensors(params, map)
}
 else{
  toast(`There are no measurements for ${params.name} on sensor ${params.sensor}`,'grey darken-1 rounded')
 }

}

const activateDrawBtn = (drawBtn, params)=>{
  typeof params.name !== "string" || typeof params.sensor!== "string"?
  drawBtn.classList.add('disabled'):drawBtn.classList.remove('disabled')
}

const selectDroneFlight = async(element, map) =>{
  let params = {}
  const selectionName= element.querySelector('#selectDrone');
  const selectionSensor= element.querySelector('#selectSensor');
  const drawBtn = element.querySelector('#draw-btn');
  createOption (selectionName)
  
  selectionName.addEventListener('change',e=>{
    params.name=e.target.value;
    activateDrawBtn(drawBtn, params)
  })

  selectionSensor.addEventListener('change',e=>{
    params.sensor=e.target.value;
    activateDrawBtn(drawBtn, params)
  })

  drawBtn.addEventListener('click',e=>{
    flag = false;
    drawCirclesPollutant(params,map)
    circlesArray.forEach(c=>removeLine(c)) 
  })

}

const landing = (drone, polylinesArray, infowindow, selection)=>{

  socket.on(`${drone.name}_landing`, data => {
    toast(`${drone.name}: The Andean Drone ${drone.comercial_name} has landed now.`,'white-text blue darken-1 rounded');
    setTimeout(polylinesArray.forEach(p=>{removeLine(p);infowindow.close()}) , 10000)
    circlesArray.forEach(c=>removeLine(c))
    createOption(selection)
  })
  
};

 export const newPolyline = (flightPlanCoordinates)=>new google.maps.Polyline({
  path: flightPlanCoordinates,
  strokeColor: "#000000",
  strokeOpacity: 1.0,
  strokeWeight: 2
  });

const callSocketFlight = (drone, map, selection) => {
  const flightPlanCoordinates = [];
  let polylinesArray = [];

  const marker=map.markers.find(el=>el.id===drone.name+'_marker')
  const infowindow = map.infowindows.find(el=>el.id===drone.name+'_infowindow')
  // const bounds = new google.maps.LatLngBounds();
    
		socket.on(`${drone.name}_telemetry`, async data => {
      const start = await lastStartFlight(drone.name)
      const timer=intervalToDuration({start:new Date(typeof start==='string'?new Date():start.start_flight),end:new Date()})
      latlngLine = {
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lon),
      };
            await noParametersRequest('flight_log_info_during_flight')
            .then(e=>e.forEach(drone=>{
              if (data.ID===drone.name) {
                flightPlanCoordinates.push(new google.maps.LatLng(data.lat, data.lon))
                const polyline = newPolyline(flightPlanCoordinates)
              
                addLine(polyline,map)
                polylinesArray.push(polyline)
              }
            }))
            .catch(e=>null)
        marker.setPosition(latlngLine)
        infowindow.setContent(infoWindowT(data,drone,timer))
        infowindow.open(map, marker);
        // bounds.extend(new google.maps.LatLng(data.lat, data.lon))
        // map.fitBounds(bounds);
        

    })
   landing(drone, polylinesArray, infowindow, selection)
}

const takeoff = (drone, selection)=>{

  socket.on(`${drone.name}_takeoff`, data => {
    toast(`${drone.name}: The Andean Drone ${drone.comercial_name} has taken off now.`,'orange darken-1 rounded');
    createOption(selection)
  })

};

export const newMarkerDrone = (drone,map)=>new google.maps.Marker({
  position: JSON.parse(drone.position),
  map: map,
  icon: {
  url: 'img/andeanDrone.png',
  scaledSize: new google.maps.Size(80, 80),
  },
  id: drone.name + '_marker',
});

const requestDrones = async (map, element) => {
  const drone_list = await noParametersRequest('AllDronesInMap/');
  if (drone_list.length>=1){
    drone_list.forEach((a_drone) => {
    a_drone.position=JSON.stringify({'lat':parseFloat(a_drone.lat),'lng':parseFloat(a_drone.lon)});
    const marker = newMarkerDrone(a_drone,map)
    const infowindow = new google.maps.InfoWindow({id:a_drone.name+'_infowindow'});
    map.infowindows.push(infowindow)
    map.markers.push(marker)
   
    const bounds = new google.maps.LatLngBounds();
    map.markers.forEach(m=> bounds.extend(m.getPosition()))
    map.fitBounds(bounds);

    takeoff(a_drone, element.querySelector('#selectDrone'))
    callSocketFlight(a_drone,map, element.querySelector('#selectDrone'))
    
    });
    selectDroneFlight(element,map)
    

  }else {
    toast(`There are no Andean Drones available at the moment.`,'grey darken-1 rounded')
  }
 
};


export { requestDrones };
