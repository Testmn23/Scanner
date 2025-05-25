# Deployment Guide: Mini QR Application

This guide explains how to build and run the Mini QR application (which includes the frontend and the backend API) using Docker.

## Prerequisites

*   **Docker:** Ensure you have Docker installed and running on your system. You can download it from [Docker's official website](https://www.docker.com/get-started).

## Building the Docker Image

1.  **Clone the Repository:**
    If you haven't already, clone the repository to your local machine.
    ```bash
    # Replace with the actual repository URL
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Build the Image:**
    Navigate to the root directory of the project (where the `Dockerfile` is located) and run the following command to build the Docker image. You can replace `mini-qr-app` with your preferred image name.

    ```bash
    docker build -t mini-qr-app .
    ```
    This command reads the `Dockerfile`, installs dependencies (including those for the API and `canvas`), builds the frontend application, and packages everything into a runnable image.

## Running the Docker Container

Once the image is built successfully, you can run it as a Docker container:

```bash
docker run -p 8080:8080 mini-qr-app
```

*   `-p 8080:8080`: This maps port 8080 on your host machine to port 8080 inside the Docker container (where the application server is listening). If port 8080 is already in use on your host, you can change the host port (e.g., `-p 8081:8080`).
*   `mini-qr-app`: This is the name of the image you built in the previous step.

The server inside the container will start, serving both the frontend application and the backend API.

## Accessing the Application & API

After starting the container, you can access:

*   **Frontend Application:**
    Open your web browser and navigate to:
    `http://localhost:8080`
    (If you used a different host port in `docker run`, replace `8080` accordingly).

*   **Backend API:**
    The API is served from the same origin, under the `/api` path.
    *   **Base URL:** `http://localhost:8080/api`
    *   **Example Endpoints:**
        *   QR Code Generation: `POST http://localhost:8080/api/qrcode`
        *   QR Code Scanning: `POST http://localhost:8080/api/scan`

    Refer to the `apidoc.md` file for detailed information on API usage, parameters, and examples.

## Notes

*   The Docker image created by this process is self-contained. It includes the Node.js runtime, all necessary application dependencies, the built static frontend assets, and the Express.js server that handles both serving the frontend and providing the backend API functionalities.
*   If you make changes to the application code (frontend or backend), you will need to rebuild the Docker image to include those changes.
```
