#!/bin/bash
set -euo pipefail

# Disposable single-node Ceph for real RGW authorization tests; never mount host data here.
mkdir -p /etc/ceph /var/lib/ceph/mon/ceph-a /var/lib/ceph/osd/ceph-0 /var/run/ceph
cat > /etc/ceph/ceph.conf <<'CONFIG'
[global]
fsid = 61ebda07-35a7-4ae3-b756-862230f1354f
mon host = 127.0.0.1
mon initial members = a
auth cluster required = none
auth service required = none
auth client required = none
osd pool default size = 1
osd pool default min size = 1
osd pool default pg num = 32
osd pool default pgp num = 32
mon allow pool size one = true
mon max pg per osd = 4096
rgw override bucket index max shards = 1
osd memory target = 536870912
bluestore block size = 2147483648
bluestore block create = true
osd crush chooseleaf type = 0
[client.rgw.test]
rgw frontends = beast port=8080 ssl_port=8443 ssl_certificate=/tmp/rgw.pem
rgw dns name = localhost
CONFIG
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj /CN=localhost \
  -addext 'subjectAltName=DNS:localhost,IP:127.0.0.1' \
  -keyout /tmp/rgw.key -out /tmp/rgw.crt
cat /tmp/rgw.crt /tmp/rgw.key > /tmp/rgw.pem
monmaptool --create --add a 127.0.0.1 --fsid 61ebda07-35a7-4ae3-b756-862230f1354f /tmp/monmap
ceph-mon --mkfs -i a --monmap /tmp/monmap
ceph-mon -i a
ceph osd create 3d875c83-902e-49e9-a11f-96b37725c1b4
ceph-osd -i 0 --mkfs --osd-uuid 3d875c83-902e-49e9-a11f-96b37725c1b4
ceph osd crush add osd.0 1 root=default host=local
ceph-osd -i 0
ceph osd in 0
# Pool creation is rejected until the monitor has observed a usable OSD.
until ceph osd stat --format json | python3 -c 'import json,sys; sys.exit(json.load(sys.stdin)["num_up_osds"] != 1)'; do
  sleep 1
done
mkdir -p /var/lib/ceph/mgr/ceph-a
ceph-mgr -i a
# Explicit small pools keep the disposable backend independent of RGW's production pool sizing.
for pool in .rgw.root default.rgw.log default.rgw.control default.rgw.meta default.rgw.buckets.index default.rgw.buckets.data default.rgw.buckets.non-ec; do
  ceph osd pool create "$pool" 8 8 --yes-i-really-mean-it
  ceph osd pool application enable "$pool" rgw
done
radosgw-admin user create --uid owner --display-name owner --access-key owner-key --secret-key owner-secret
exec radosgw -n client.rgw.test -f
