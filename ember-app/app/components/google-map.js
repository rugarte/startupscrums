/* global google */
import Ember from 'ember';
import _ from 'lodash/lodash';

const { observer } = Ember;

export default Ember.Component.extend({
  didUpdateAttrs() {
    const circle = this.get('circle');
    circle.setMap(null);
  },

  drawMarkers: observer('onlineUsers.[]', function() {
    const map = this.get('map');
    const users = this.get('onlineUsers');
    const latitude = this.get('latitude');
    users.forEach(user => {
      let latitude = user.get('latitude');
      let longitude = user.get('longitude');
      const marker = new google.maps.Marker({
        icon: user.get('profileImageURL'),
        position: new google.maps.LatLng(latitude, longitude),
        optimized: true,
        map: map
      });
      marker.setMap(map);
      this.attrs.markerCallback(user.id, marker);
    });
  }),

  removeMarkers: observer('offlineUsers.[]', function() {
    const users = this.get('offlineUsers');
    const map = this.get('map');
    const markers = this.get('activeMarkers');
    users.forEach(user => {
      const marker = markers[user.get('id')];
      marker.setMap(null);
      delete markers[user.get('id')];
    });
  }),


  insertMap: function() {
    const latitude = this.get('latitude');
    const longitude = this.get('longitude');
    const container = this.$('.map-canvas')[0];
    this.set('container', container);
    const options = {
      center: new google.maps.LatLng(latitude, longitude),
      zoom: 14
    };
    this.set('map', new google.maps.Map(container, options));
  }.on('didInsertElement'),

  insertCircle: function() {
    const radiusInKm = this.get('radiusInKm');
    const map = this.get('map');
    const circle = new google.maps.Circle({
      strokeColor: '#6D3099',
      strokeOpacity: 0.7,
      strokeWeight: 1,
      fillColor: '#CDDC39',
      fillOpacity: 0.35,
      map: map,
      center: new google.maps.LatLng(this.get('latitude'), this.get('longitude')),
      radius: ((radiusInKm) * 1000),
      draggable: true
    });
    google.maps.event.addListener(circle, 'drag', _.debounce(this.updateCriteria.bind(this), 150));
    this.set('circle', circle);
  }.on('didRender'),

  updateCriteria() {
    const center = this.get('circle').getCenter();
    const radius = this.get('radiusInKm');
    this.attrs.updateCallback(center, radius);
  }
});
