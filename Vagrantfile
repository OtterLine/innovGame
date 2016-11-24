# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|

  config.vm.box = "debian/contrib-jessie64"

  config.vm.network "forwarded_port", guest: 5000, host: 5000

  config.vm.synced_folder ".", "/innov"

  config.vm.provision "shell", path: "vagrant_bootstrap.sh"
end
