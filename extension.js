/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
*
* SPDX-License-Identifier: GPL-2.0-or-later
*/

import GObject from 'gi://GObject';
import St from 'gi://St';
import GLib from 'gi://GLib';
import Soup from 'gi://Soup';

import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const URI_PUBLIC_IP_V4 = "https://api.ipify.org";
const URI_PUBLIC_IP_V6 = "https://api6.ipify.org";
const newMenuItem = (label) => {
    return new PopupMenu.PopupMenuItem(label);
}

const Indicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {

        fetchIPs(uri) {
            return new Promise(async (resolve, reject) => {
                try {
                    const message = Soup.Message.new('GET', uri);
                    const session = new Soup.Session();
                    const bytes = await session.send_and_read_async(
                        message,
                        GLib.PRIORITY_DEFAULT,
                        null,
                    );

                    if (message.get_status() != Soup.Status.OK) {
                        console.log(`HTTP Status ${message.status_code}`);
                    }

                    const textDecoder = new TextDecoder("utf-8");
                    const publicIP = textDecoder.decode(bytes.toArray());
                    console.log("Response: " + publicIP);
                    resolve(publicIP);
                } catch (e) {
                    reject(e);
                }
            });
        }

        async refresh(itemIPv4, itemIPv6) {
            try {
                const ipv4str = await this.fetchIPs(URI_PUBLIC_IP_V4);
                const ipv6str = await this.fetchIPs(URI_PUBLIC_IP_V6);

                itemIPv4.label.set_text(ipv4str);
                itemIPv6.label.set_text(ipv6str);
                Main.notify(_("Your public IP list is refreshed!\n To copy, click the item"));
            } catch (e) {
                console.log(e);
                return
            }
        }

        _init() {
            super._init(0.0, _('MyPubIP'));
            // menu items
            this.refreshItem = newMenuItem('Refresh');
            this.itemIPv4 = newMenuItem('Fetching IPv4...');
            this.itemIPv6 = newMenuItem('Fetching IPv6...');

            this.refreshItem.connect('activate', async () => this.refresh(this.itemIPv4, this.itemIPv6));
            this.menu.addMenuItem(this.refreshItem);
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            this.menu.addMenuItem(this.itemIPv4);
            this.menu.addMenuItem(this.itemIPv6);

            this.add_child(new St.Icon({
                icon_name: 'network-server-symbolic',
                style_class: 'system-status-icon',
            }));

            // for api v4
            this.fetchIPs(URI_PUBLIC_IP_V4).then((ipv4str) => {
                this.ipv4str = ipv4str;
                console.log(ipv4str);
                this.itemIPv4.label.set_text(ipv4str);
                this.itemIPv4.connect('activate', async () => {
                    console.log("Response: " + this.ipv4str);
                    Main.notify(_(`Your public IPv4: ${this.ipv4str}, copied to clipboard`));
                    St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, this.ipv4str);
                })
            }).catch(e => {
                console.log("Error: could not fetch public IP address: " + e);
            });

            // for api v6
            this.fetchIPs(URI_PUBLIC_IP_V6).then((ipv6str) => {
                this.ipv6str = ipv6str;
                console.log(ipv6str);
                this.itemIPv6.label.set_text(ipv6str);
                this.itemIPv6.connect('activate', async () => {
                    console.log("Response: " + this.ipv6str);
                    Main.notify(_(`Your public IPv6: ${this.ipv6str} copied to clipboard`));
                    St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, this.ipv6str);
                })
            }).catch(e => {
                console.log("Error: could not fetch public IP address: " + e);
            });
        }
    });

export default class MyPubIP extends Extension {
    enable() {
        this._indicator = new Indicator();
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
    }
}
