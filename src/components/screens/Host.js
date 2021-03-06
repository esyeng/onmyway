import React, { Component } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableHighlight,
  Keyboard,
  ActivityIndicator,
  Image,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { apiKey } from "./google-api";
import _ from "lodash";
import socketIO from "socket.io-client";
import BottomButton from "./BottomButton";
import polyline from "@mapbox/polyline";
const guestList = {};
const dummyData = {
  1: { latitude: 37.38723661, longitude: -120.15426073 },
  2: { latitude: 38.38723661, longitude: -118.15426073 },
  3: { latitude: 39.38723661, longitude: -116.15426073 },
  4: { latitude: 40.38723661, longitude: -122.15426073 },
  5: { latitude: 41.38723661, longitude: -124.15426073 },
  6: { latitude: 42.38723661, longitude: -126.15426073 },
  7: { latitude: 43.38723661, longitude: -128.15426073 },
  8: { latitude: 44.38723661, longitude: -130.15426073 },
};
export default class Host extends Component {
  constructor(props) {
    super(props);
    this.state = {
      latitude: null,
      longitude: null,
      pointCoords: [],
      destination: "",
      routeResponse: {},
      predictions: [],
      lookingForGuest: false,
      guestIsOnTheWay: false,
      mylocation: {},
      guestLocation: {},
    };

    this.onChangeDestinationDebounced = _.debounce(
      this.onChangeDestination,
      1000
    );
    this.getRouteDirections = this.getRouteDirections.bind(this);
  }

  componentWillUnmount() {
    navigator.geolocation.clearWatch(this.watchId);
  }
  componentDidMount() {
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => console.log(error),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 }
    );
  }

  async getRouteDirections(destinationPlaceId, destinationName) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${this.state.latitude},${this.state.longitude}&destination=place_id:${destinationPlaceId}&key=${apiKey}`
      );

      const json = await response.json();

      const points = polyline.decode(json.routes[0].overview_polyline.points);
      const pointCoords = points.map((point) => {
        return { latitude: point[0], longitude: point[1] };
      });
      this.setState({
        pointCoords,
        routeResponse: json,
      });
      Keyboard.dismiss();
      return destinationName;
    } catch (error) {
      console.error(error);
    }
  }

  async onChangeDestination(destination) {
    const apiUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?key=${apiKey}
    &input=${destination}&location=${this.state.latitude},${this.state.longitude}&radius=2000`;

    try {
      const result = await fetch(apiUrl);
      const json = await result.json();
      this.setState({
        predictions: json.predictions,
      });
    } catch (err) {
      console.log(err);
    }
  }

  getRandomInt() {
    return Math.floor(Math.random() * Math.floor(1000));
  }
  requestGuest() {
    this.setState({ lookingForGuest: true });

    const socket = socketIO.connect("http://192.168.0.153:5000");

    socket.on("connection");
    socket.emit("guestRequest", this.state.routeResponse);

    socket.on("guestAccepts", (guestLocation, Id) => {
      console.log("ID :", Id);
      guestList[Id] = guestLocation;
      const pointCoords = [...this.state.pointCoords, guestLocation];

      // this.map.fitToCoordinates(pointCoords, {
      //   edgePadding: { top: 140, bottom: 20, left: 20, right: 20 },
      // });
      this.setState({
        lookingForGuest: false,
        guestIsOnTheWay: true,
        guestLocation,
        pointCoords,
      });
    });

    socket.on("liveTracking", (guestLocation, Id) => {
      const pointCoords = [...this.state.pointCoords, guestLocation];
      guestList[Id] = guestLocation;

      // this.map.fitToCoordinates(pointCoords, {
      //   edgePadding: { top: 140, bottom: 20, left: 20, right: 20 },
      // });
      this.setState({
        lookingForGuest: false,
        guestIsOnTheWay: true,
        guestLocation,
        pointCoords,
      });

      // this.onChangeDestinationDebounced(guestLocation);
    });
  }

  render() {
    let marker = null;
    let getGuest = null;
    let findingGuestActIndicator = null;
    let guestMarker = null;
    // const drivers = Object.values(dummyData);
    const drivers = this.state.pointCoords;
    if (!this.state.latitude) return null;

    if (this.state.guestIsOnTheWay) {
      guestMarker = (
        <Marker coordinate={this.state.guestLocation} key={this.getRandomInt()}>
          <Image
            source={require("../images/carIcon.png")}
            style={{ width: 40, height: 40 }}
          />
        </Marker>
      );
    }

    if (this.state.lookingForGuest) {
      findingGuestActIndicator = (
        <ActivityIndicator
          size="large"
          animating={this.state.lookingForGuest}
        />
      );
    }

    if (this.state.pointCoords.length > 1) {
      //added =
      marker = (
        <Marker
          key={this.getRandomInt()}
          coordinate={this.state.pointCoords[this.state.pointCoords.length - 1]}
        />
      );
    }

    getGuest = (
      <BottomButton
        key={this.getRandomInt()}
        onPressFunction={() => this.requestGuest()}
        buttonText="Connect with Guests"
      >
        {findingGuestActIndicator}
      </BottomButton>
    );

    const predictions = this.state.predictions.map((prediction, index) => (
      <TouchableHighlight
        key={index}
        onPress={async () => {
          const destinationName = await this.getRouteDirections(
            prediction.place_id,
            prediction.structured_formatting.main_text
          );
          this.setState({ predictions: [], destination: destinationName });
          // this.map.fitToCoordinates(this.state.pointCoords, {
          //   edgePadding: { top: 20, bottom: 20, left: 20, right: 20 },
          // });
        }}
        key={this.getRandomInt()}
      >
        <View>
          <Text key={this.getRandomInt()} style={styles.suggestions}>
            {prediction.structured_formatting.main_text}
          </Text>
        </View>
      </TouchableHighlight>
    ));

    return (
      <View style={styles.container}>
        <MapView
          key={this.getRandomInt()}
          ref={(map) => {
            this.map = map;
          }}
          style={styles.map}
          initialRegion={{
            latitude: this.state.latitude,
            longitude: this.state.longitude,
            latitudeDelta: 0.2,
            longitudeDelta: 0.2,
          }}
          showsUserLocation={true}
        >
          <Polyline
            key={this.getRandomInt()}
            coordinates={this.state.pointCoords}
            strokeWidth={1}
            strokeColor="red"
          />
          {drivers.map((driver) => (
            <MapView.Marker
              coordinate={driver}
              title="guest"
              key={this.getRandomInt()}
            >
              <Image
                source={require("../images/carIcon.png")}
                style={{ width: 40, height: 40 }}
              />
            </MapView.Marker>
          ))}

          {marker}
          {guestMarker}
        </MapView>
        {/* <TextInput
          placeholder="Enter destination..."
          style={styles.destinationInput}
          value={this.state.destination}
          clearButtonMode="always"
          onChangeText={(destination) => {
            this.setState({ destination, pointCoords: [] });
            this.onChangeDestinationDebounced(destination);
          }}
        /> */}

        {predictions}
        {getGuest}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  findGuest: {
    backgroundColor: "black",
    marginTop: "auto",
    margin: 20,
    padding: 15,
    paddingLeft: 30,
    paddingRight: 30,
    alignSelf: "center",
  },
  findGuestText: {
    fontSize: 20,
    color: "white",
    fontWeight: "600",
  },
  suggestions: {
    backgroundColor: "white",
    padding: 5,
    fontSize: 18,
    borderWidth: 0.5,
    marginLeft: 5,
    marginRight: 5,
  },
  destinationInput: {
    height: 40,
    borderWidth: 0.5,
    marginTop: 50,
    marginLeft: 5,
    marginRight: 5,
    padding: 5,
    backgroundColor: "white",
  },
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});
