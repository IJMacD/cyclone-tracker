import React from 'react';
import Map from './Map';
import './App.css';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

class App extends React.Component {
  constructor (props) {
    super(props);

    this.state = {
      cyclones: [],
      myLocation: null,
    };
  }

  componentDidMount () {
    navigator.geolocation.getCurrentPosition(({ coords: myLocation }) => {
      this.setState({ myLocation });
    });

    this.timeout = setInterval(this.fetchData.bind(this), FIFTEEN_MINUTES);
    this.fetchData();
  }

  componentWillUnmount () {
    clearInterval(this.timeout);
    this.timeout = null;
  }

  async fetchData () {
    const r = await fetch("https://www.i-learner.edu.hk/weather/api/v2/cyclone");
    const cyclones = await r.json();

    // Avoid updating state after unmount
    if (this.timeout) {
      this.setState({ cyclones });
    }
  }

  render () {
    return (
      <div className="App">
        <ul style={{ position: "fixed" }}>
          {this.state.cyclones.map(c => <li key={c.id}>{c.name} {c.distance}km {c.bearing}</li>)}
        </ul>
        <Map cyclones={this.state.cyclones} myLocation={this.state.myLocation} />
      </div>
    );
  }
}

export default App;
