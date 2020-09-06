import React, { Component } from "react";
import {
  StyleSheet,
  View,
  Image,
  ActivityIndicator,
  Linking,
  Platform,
  Alert,
} from "react-native";
import MapView, { Polyline, Marker } from "react-native-maps";
import BottomButton from "./BottomButton";
import { apiKey } from "./google-api";
import polyline from "@mapbox/polyline";
import socketIO from "socket.io-client";
import * as Location from "expo-location";
import { isNull } from "lodash";
// import * as TaskManager from "expo-task-manager";
import BackgroundGeolocation from "react-native-mauron85-background-geolocation";

export default class Driver extends Component {
  constructor(props) {
    super(props);
    this.state = {
      latitude: 0,
      longitude: 0,
      destination: "",
      predictions: [],
      pointCoords: [],
      lookingForPassengers: false,
      buttonText: "Look for Passengers",
    };
    this.acceptPassengerRequest = this.acceptPassengerRequest.bind(this);
    this.findPassengers = this.findPassengers.bind(this);
    this.socket = null;
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
    // Location.startLocationUpdatesAsync(taskName, options);
  }

  async getRouteDirections(destinationPlaceId) {
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
      this.map.fitToCoordinates(pointCoords, {
        edgePadding: { top: 20, bottom: 20, left: 20, right: 20 },
      });
    } catch (error) {
      console.error(error);
    }
  }
  getRandomInt() {
    return Math.floor(Math.random() * Math.floor(1000));
  }
  findPassengers() {
    if (!this.state.lookingForPassengers) {
      this.setState({ lookingForPassengers: true });

      this.socket = socketIO.connect("http://192.168.0.152:5000");

      this.socket.on("connection", () => {
        this.socket.emit("passesngerRequest");
      });

      this.socket.on("taxiRequest", (routeResponse) => {
        console.log(routeResponse);
        this.setState({
          lookingForPassengers: false,
          passengerFound: true,
          routeResponse,
        });
        this.getRouteDirections(routeResponse.geocoded_waypoints[0].place_id);
      });
    }
  }
  acceptPassengerRequest() {
    const passengerLocation = this.state.pointCoords[
      this.state.pointCoords.length - 1
    ];
  }

  render() {
    let endMarker = null;
    let startMarker = null;
    let findingPassengerActIndicator = null;
    let passengerSearchText = "FIND PASSENGERS 👥";
    let bottomButtonFunction = this.findPassengers;
    if (!this.state.latitude) return null;

    if (this.state.lookingForPassengers) {
      passengerSearchText = "FINDING PASSENGERS...";
      findingPassengerActIndicator = (
        <ActivityIndicator
          key={this.getRandomInt()}
          size="large"
          animating={this.state.lookingForPassengers}
        />
      );
    }

    if (this.state.passengerFound) {
      passengerSearchText = "FOUND PASSENGER! ACCEPT RIDE?";
      bottomButtonFunction = this.acceptPassengerRequest;
    }

    if (this.state.pointCoords.length > 1) {
      endMarker = (
        <Marker
          key={this.getRandomInt()}
          coordinate={this.state.pointCoords[this.state.pointCoords.length - 1]}
        >
          <Image
            style={{ width: 40, height: 40 }}
            source={require("../images/person-marker.png")}
          />
        </Marker>
      );
    }

    return (
      <View style={styles.container}>
        <MapView
          key={this.getRandomInt()}
          ref={(map) => {
            this.map = map;
          }}
          style={styles.map}
          region={{
            latitude: this.state.latitude,
            longitude: this.state.longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.0121,
          }}
          showsUserLocation={true}
        >
          <Polyline
            coordinates={this.state.pointCoords}
            strokeWidth={4}
            strokeColor="red"
          />
          {endMarker}
          {startMarker}
        </MapView>
        <BottomButton
          onPressFunction={() => {
            this.findPassengers();
          }}
          buttonText={this.state.buttonText}
        >
          {findingPassengerActIndicator}
        </BottomButton>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  findDriver: {
    backgroundColor: "black",
    marginTop: "auto",
    margin: 20,
    padding: 15,
    paddingLeft: 30,
    paddingRight: 30,
    alignSelf: "center",
  },
  findDriverText: {
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
