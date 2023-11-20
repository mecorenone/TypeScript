import {
    combinePaths,
    createPackageJsonInfo,
    Debug,
    forEachAncestorDirectory,
    getDirectoryPath,
    Path,
    ProjectPackageJsonInfo,
    Ternary,
    tryFileExists,
} from "./_namespaces/ts";
import {
    ProjectService,
} from "./_namespaces/ts.server";

/** @internal */
export interface PackageJsonCache {
    addOrUpdate(file: string, path: Path): void;
    delete(fileName: Path): void;
    getInDirectory(directory: string): ProjectPackageJsonInfo | undefined;
    directoryHasPackageJson(directory: string): Ternary;
    searchDirectoryAndAncestors(directory: string): void;
}

/** @internal */
export function createPackageJsonCache(host: ProjectService): PackageJsonCache {
    const packageJsons = new Map<Path, ProjectPackageJsonInfo>();
    const directoriesWithoutPackageJson = new Map<Path, true>();
    return {
        addOrUpdate,
        delete: fileName => {
            packageJsons.delete(fileName);
            directoriesWithoutPackageJson.set(getDirectoryPath(fileName), true);
        },
        getInDirectory: directory => {
            return packageJsons.get(host.toPath(combinePaths(directory, "package.json"))) || undefined;
        },
        directoryHasPackageJson: directory => directoryHasPackageJson(host.toPath(directory)),
        searchDirectoryAndAncestors: directory => {
            forEachAncestorDirectory(directory, ancestor => {
                const ancestorPath = host.toPath(ancestor);
                if (directoryHasPackageJson(ancestorPath) !== Ternary.Maybe) {
                    return true;
                }
                const packageJsonFileName = combinePaths(ancestor, "package.json");
                if (tryFileExists(host, packageJsonFileName)) {
                    addOrUpdate(packageJsonFileName, combinePaths(ancestorPath, "package.json") as Path);
                }
                else {
                    directoriesWithoutPackageJson.set(ancestorPath, true);
                }
            });
        },
    };

    function addOrUpdate(file: string, path: Path) {
        const packageJsonInfo = Debug.checkDefined(createPackageJsonInfo(file, host.host));
        packageJsons.set(path, packageJsonInfo);
        directoriesWithoutPackageJson.delete(getDirectoryPath(path));
    }

    function directoryHasPackageJson(directory: Path) {
        const path = host.toPath(directory);
        return packageJsons.has(combinePaths(path, "package.json") as Path) ? Ternary.True :
            directoriesWithoutPackageJson.has(path) ? Ternary.False :
            Ternary.Maybe;
    }
}
