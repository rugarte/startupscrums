import Ember from 'ember';
import ENV from 'ember-app/config/environment';

const { inject } = Ember;

export default Ember.Route.extend({
  firebase: inject.service(),
  beforeModel: function() {
    return this.get("session").fetch().catch(function() {});
  },

  actions: {
    signIn: function(provider) {
      const success = (response) => {
        const firebase = this.get('firebase');
        const usersRef = firebase.child('users');
        const data = {};
        data[response.uid] = {
          username: response.currentUser.username,
          profileImageURL: response.currentUser.profileImageURL
        }
        usersRef.set(data);
      };
      this.get("session").open("firebase", { provider: provider}).then(success);
    },
    signOut: function() {
      this.get("session").close();
    }
  }
});
