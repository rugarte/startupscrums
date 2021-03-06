/* global GeoFire */
/* global google */
import Ember from 'ember';
import ENV from 'ember-app/config/environment';
import _ from 'lodash/lodash';

const { computed, inject } = Ember;

export default Ember.Controller.extend({
  firebase: inject.service(),
  users: {},
  radius: 1,
  rangeInKm: 1,

  setup: Ember.on('init', function() {
    this.initLocation();
    // this.initGeo();
    // this._getLocation();
    // this._initGeoQueryObservers();
  }),

  initGeo() {
    const firebase = this.get('firebase');
    const geoFire = new GeoFire(firebase.child('geoFireData'));
    const center = [this.get('latitude'), this.get('longitude')];
    const geoQuery = geoFire.query({
      center: center,
      radius: 1
    });
    this.set('geoQuery', geoQuery);
    this.set('geoFire', geoFire);
  },

  initLocation() {
    const success = (location) => {
      const latitude = location.coords.latitude;
      const longitude = location.coords.longitude;
      this.set('longitude', longitude);
      this.set('latitude', latitude);
      this.initGeo();
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((location) => success(location));
    } else {
      alert('Your browser does not support geolocation')
    }
  },

  _initGeoQueryObservers() {
    const geoQuery = this.get('geoQuery');
    const users = this.get('users');
    geoQuery.on('key_entered', (userID, userLocation) => {
      users[userID] = { userID: userID, location: userLocation };
      const latitude = userLocation[0];
      const longitude = userLocation[1];
      let marker = 'marker';
      this.store.findRecord('user', userID).then(value => {
        debugger;
        console.log(marker);
      })
    });
  },

  initializeMap: Ember.on('init', function() {
    Ember.run.schedule('afterRender', () => {
      const center = [49.2755547, -123.12144119999999];
      const loc = new google.maps.LatLng(center[0], center[1]);
      const radiusInKm = 1;

      // Create the Google Map
      const map = new google.maps.Map(document.getElementById("map-canvas"), {
        center: loc,
        zoom: 14,
        mapTypeId: google.maps.MapTypeId.ROADMAP
      });

      this.set('map', map);

      // Create a draggable circle centered on the map
      const circle = new google.maps.Circle({
        strokeColor: "#6D3099",
        strokeOpacity: 0.7,
        strokeWeight: 1,
        fillColor: '#CDDC39',
        fillOpacity: 0.35,
        map: map,
        center: loc,
        radius: ((radiusInKm) * 1000),
        draggable: true
      });

      //Update the query's criteria every time the circle is dragged
      var updateCriteria = _.debounce(() => {
        const geoQuery = this.get('geoQuery');
        var latLng = circle.getCenter();
        geoQuery.updateCriteria({
          center: [latLng.lat(), latLng.lng()],
          radius: radiusInKm
        });
      }, 10);
      google.maps.event.addListener(circle, "drag", updateCriteria);
    });
  }),

  onlineUsers: computed('model.@each.isOnline', function() {
    const users = this.get('model');
    return users.filterBy('isOnline', true);
  }),

  offlineUsers: computed('model.@each.isOnline', function() {
    const users = this.get('model');
    return users.filterBy('isOnline', false);
  }),

  activeMarkers: {},

  actions: {
    updateGeoQuery() {
    },

    addMarker(user, marker) {
      const markers = this.get('activeMarkers');
      markers[user] = marker;
    },

    checkIn() {
      const userId = this.get('session.uid');
      const longitude = this.get('longitude');
      const latitude = this.get('latitude');
      const firebase = this.get('firebase');
      const firebaseRef = firebase.child('geoFireData');
      const geoFire = new GeoFire(firebaseRef);
      geoFire.set(userId, [latitude, longitude]);
      this.store.findRecord('user', userId).then((user) => {
        user.set('uid', userId);
        user.set('latitude', latitude);
        user.set('longitude', longitude);
        user.set('isOnline', true);
        user.save();
        this._createUserMarker(user);
      });
    },

    checkOut() {
      const userId = this.get('session.uid');
      this.store.findRecord('user', userId).then(user => {
        user.set('isOnline', false);
        user.save();
      });
      const firebaseRef = this.get('firebase').child('geoFireData');
      firebaseRef.child(userId).remove();
    }
  },

  _getLocation() {
    const geolocationCallback = this._geolocationCallback;
    const errorHandler = this._errorHandler;

    if (typeof navigator !== "undefined" && typeof navigator.geolocation !== "undefined") {
      console.log("Asking user to get their location");
      navigator.geolocation.getCurrentPosition((location) => geolocationCallback(this, location), errorHandler);
    } else {
      console.log("Your browser does not support the HTML5 Geolocation API, so this demo will not work.")
    }
  },

  _geolocationCallback: function(context, location) {
      const geoFire = context.get('geoFire');
      const latitude = location.coords.latitude;
      const longitude = location.coords.longitude;
      context.set('longitude', longitude);
      context.set('latitude', latitude);

      console.log("Retrieved user's location: [" + latitude + ", " + longitude + "]");
  },

  _errorHandler() {
    if (error.code == 1) {
      console.log("Error: PERMISSION_DENIED: User denied access to their location");
    } else if (error.code === 2) {
      console.log("Error: POSITION_UNAVAILABLE: Network is down or positioning satellites cannot be reached");
    } else if (error.code === 3) {
      console.log("Error: TIMEOUT: Calculating the user's location too took long");
    } else {
      console.log("Unexpected error code")
    }
  },

  _createUserMarker(user) {
    const map = this.get('map');
    const latitude = user.get('latitude');
    const longitude = user.get('longitude');

    const marker = new google.maps.Marker({
      icon: user.get('profileImageURL'),
      position: new google.maps.LatLng(latitude, longitude),
      optimized: true,
      map: map
    });

    marker.setMap(map);
  },

  _createMarker(id, imageURL, latitude, longitude ) {
    const map = this.get('map');
    const marker = new google.maps.Marker({
      icon: imageURL,
      position: new google.maps.LatLng(latitude, longitude),
      optimized: true,
      map: map
    });

    return marker;
  }
});
