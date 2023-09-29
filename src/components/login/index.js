import React from "react";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import "./index.scss";

function Login() {
  const darkTheme = createTheme({
    palette: {
      mode: "dark",
    },
  });

  function submit() {
    console.log("click");
  }

  return (
    <div className="login">
      <ThemeProvider theme={darkTheme}>
        <div className="loginContainer">
          <div className="title">Login</div>
          <div className="usernameContainer">
            <TextField
              required
              className="username"
              label="Username"
              variant="filled"
              color="primary"
            />
          </div>
          <div className="passwordContainer">
            <TextField
              required
              className="password"
              label="Password"
              type="password"
              variant="filled"
              color="primary"
            />
          </div>
          <div className="submitContainer">
            <Button
              className="submit"
              variant="contained"
              color="primary"
              onClick={submit}
            >
              Login
            </Button>
          </div>
          <div className="createContainer">
            <Link className="link" href="/create">
              Create Account
            </Link>
          </div>
        </div>
      </ThemeProvider>
    </div>
  );
}
export default Login;
