// Copyright 2018 IBM RESEARCH. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// =============================================================================

import * as vscode from 'vscode';
import * as Q from "q";
import {Version} from "./version";
import {IPackageInfo, IPackage} from "./interfaces";
import {PipWrapper} from "./pipWrapper";
import {PyPiWrapper} from "./pypiWrapper";

export class PipPackage implements IPackage {
    //TODO: Get Info form local installation
    public Info: IPackageInfo = {
        Name: "",
        Version: Version.fromString("-1.-1.-1"),
        Summary: "",
        Location: "",
        Dependencies: "",
        getPackageInfo: ()=>{},
    };

    private pip : PipWrapper = new PipWrapper();
    private pypi: PyPiWrapper = new PyPiWrapper();
    
    constructor(name: string, version:string){
        this.Info.Name = name;
        this.Info.Version = Version.fromString(version);
    }

    public checkVersion(): Q.Promise<void> {
        console.log(this.Info.Name);
        let packageName = this.Info.Name;
        return this.pip.getPackageInfo(this.Info.Name)
        .then((installedPkgInfo: IPackageInfo) => {
            console.log(installedPkgInfo);
            this.Info = installedPkgInfo;
            // Let's check for new versions
            return this.pypi.getPackageInfo(this.Info.Name)
        }).then((pkgInfo: IPackageInfo) => {
            if(pkgInfo.Version.isGreater(this.Info.Version)){
                console.log("New version",pkgInfo.Version.toString());
                return vscode.window.showInputBox({
                    ignoreFocusOut: true,
                    prompt: `👉 There's a new ${packageName} release: ${pkgInfo.Version.toString()}. Do you want to upgrade? 👈`,
                    value: 'Yes',
                });
            }
            return null;
        // There's a new version...
        }).then((selection: string|undefined) => {
            //Getting the selection from last showInputBox
            if(selection == 'Yes'){
                vscode.window.showInformationMessage(`Updating ${packageName}... (this may take some time, be patient 🙏)`);
                return this.pip.update(packageName)
                    .then((stdout) => {
                        console.log(stdout);
                        return Q.resolve();
                    }).then(result => {
                        console.log(result);
                        vscode.window.showInformationMessage(`${packageName} updated! 🎉🎉🎉`);
                    }).catch((error) => {
                        console.log(error);
                        vscode.window.showErrorMessage(`ERROR: Couldn't upgrade ${packageName}. ${error}`);
                        return Q.reject(error);
                    });
            }
            return Q.all();
        }).catch((err) => {
            this.pip.list()
                .then(result => {
                    //console.log("pip list",result); 
                    if (result.search(packageName) == -1 ) { 
                        console.log(`${packageName} not installed`); 
                        return vscode.window.showInputBox({
                            ignoreFocusOut: true,
                            prompt: `👉 You don't have installed ${packageName}. Do you want to install it? 👈`,
                            value: 'Yes',
                        });
                    } else { 
                        console.log(`${packageName} is already installed`); 
                        vscode.window.showInformationMessage(`👌 ${packageName} is already installed`);
                        return Q.resolve();
                    } 
                })
                .then((selection: string|undefined) => {
                    //Getting the selection from last showInputBox
                    if(selection == 'Yes'){
                        vscode.window.showInformationMessage(`Installing ${packageName}... (this may take some time, be patient 🙏)`);
                        return this.pip.install(packageName)
                            .then((stdout) => {
                                console.log(stdout);
                                return Q.resolve();
                            }).then(result => {
                                console.log(result);
                                vscode.window.showInformationMessage(`${packageName} installed! 🎉🎉🎉`);
                            }).catch((error) => {
                                console.log(error);
                                vscode.window.showErrorMessage(`ERROR: Couldn't install ${packageName}. ${error}`);
                                return Q.reject(error);
                            });
                    }
                    return Q.resolve();
                }).catch(err =>{
                    console.log("error pip list",err);
                    return Q.reject(err);   
                });
            if (err){
                return Q.reject(err);  
            }
            return Q.resolve();  
        });
    }

    public update(): Q.Promise<string> {
        return Q.resolve();
    }
}