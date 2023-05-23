provider "google" {
  project = "podsummarize"
  region  = "us-central1"
  zone    = "us-central1-c"
}

data "local_file" "cloud_init" {
  filename = "cloud-init.yaml"
}

resource "google_compute_instance" "vm_instance" {
  name         = "terraform-instance"
  machine_type = "e2-micro"

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2004-lts"
    }
  }

  network_interface {
    # A default network is created for all GCP projects
    network = "terraform-network"
    access_config {
    }
  }
  
  metadata = {
    user-data = file("cloud-init.yaml")
  }
}

resource "google_compute_network" "vpc_network" {
  name                    = "terraform-network"
  auto_create_subnetworks = "true"
}

resource "google_compute_firewall" "allow_ssh" {
  name    = "allow-ssh"
  network = "terraform-network"

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["0.0.0.0/0"]
}
